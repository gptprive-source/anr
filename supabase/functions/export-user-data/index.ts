import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if called with userId in body (from support-chat) or via JWT
    const body = await req.json().catch(() => ({}));
    let userId: string | null = null;
    const format = body.format || 'json'; // 'json' or 'pdf'
    
    if (body.userId) {
      // Called from support-chat with service role - trust the userId
      const authHeader = req.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      // Only allow if called with service role key
      if (token === supabaseServiceKey) {
        userId = body.userId;
      } else {
        return new Response(JSON.stringify({ error: 'Non autorisé' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Called directly by user with JWT
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Non autorisé' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Non autorisé' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      userId = user.id;
    }

    console.log(`[export-user-data] Exporting data for user: ${userId}, format: ${format}`);

    // Fetch all user data
    const [
      profileResult,
      residentsResult,
      subscriptionsResult,
      callLogsResult,
      consentsResult,
      pushTokensResult,
      userResult
    ] = await Promise.all([
      supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      
      supabaseClient
        .from('residents')
        .select(`
          id,
          is_owner,
          is_muted,
          status,
          created_at,
          habitation:habitations (
            id,
            name,
            floor,
            anr:anrs (
              code,
              address
            )
          )
        `)
        .eq('user_id', userId),
      
      supabaseClient
        .from('subscriptions')
        .select('id, status, current_period_start, current_period_end, cancel_at_period_end, created_at')
        .eq('user_id', userId),
      
      supabaseClient
        .from('call_logs')
        .select('id, status, started_at, answered_at, ended_at')
        .eq('answered_by', userId)
        .order('started_at', { ascending: false })
        .limit(100),
      
      supabaseClient
        .from('user_consents')
        .select('consent_type, version, consented, consented_at')
        .eq('user_id', userId),
      
      supabaseClient
        .from('push_tokens')
        .select('platform, created_at')
        .eq('user_id', userId),
      
      supabaseClient.auth.admin.getUserById(userId!)
    ]);

    // Build export data
    const userEmail = userResult.data?.user?.email || '';
    const exportData = {
      export_date: new Date().toISOString(),
      user_id: userId,
      email: userEmail,
      
      profile: profileResult.data ? {
        first_name: profileResult.data.first_name,
        last_name: profileResult.data.last_name,
        phone_number: profileResult.data.phone_number,
        phone_verified: profileResult.data.phone_verified,
        created_at: profileResult.data.created_at
      } : null,
      
      habitations: residentsResult.data?.map(r => ({
        name: (r.habitation as any)?.name,
        floor: (r.habitation as any)?.floor,
        address: (r.habitation as any)?.anr?.address,
        anr_code: (r.habitation as any)?.anr?.code,
        is_owner: r.is_owner,
        is_muted: r.is_muted,
        status: r.status,
        joined_at: r.created_at
      })) || [],
      
      subscriptions: subscriptionsResult.data?.map(s => ({
        status: s.status,
        period_start: s.current_period_start,
        period_end: s.current_period_end,
        cancel_at_period_end: s.cancel_at_period_end,
        created_at: s.created_at
      })) || [],
      
      call_history: callLogsResult.data?.map(c => ({
        status: c.status,
        started_at: c.started_at,
        answered_at: c.answered_at,
        ended_at: c.ended_at
      })) || [],
      
      consents: consentsResult.data || [],
      
      devices: pushTokensResult.data?.map(p => ({
        platform: p.platform,
        registered_at: p.created_at
      })) || [],
      
      data_retention_info: {
        call_logs: "Conservés 12 mois",
        visitor_gps: "Anonymisés après 30 jours",
        profile: "Conservé pendant la durée de l'abonnement + 3 ans",
        support_conversations: "Conservées 6 mois"
      }
    };

    // Log the export request for audit
    await supabaseClient
      .from('admin_audit_logs')
      .insert({
        user_id: userId,
        action: 'user_data_export',
        entity_type: 'user',
        entity_id: userId,
        new_value: { exported_at: new Date().toISOString(), format }
      });

    console.log(`[export-user-data] Export completed for user: ${userId}`);

    // Return PDF if requested
    if (format === 'pdf') {
      const pdfBytes = await generatePDF(exportData);
      
      return new Response(pdfBytes.buffer as ArrayBuffer, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="export-donnees-anr-${new Date().toISOString().split('T')[0]}.pdf"`
        }
      });
    }

    // Default: return JSON
    return new Response(JSON.stringify(exportData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('[export-user-data] Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generatePDF(data: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const fontSize = 10;
  const titleSize = 16;
  const headerSize = 12;
  const lineHeight = 14;
  const margin = 50;
  const pageWidth = 595;
  const pageHeight = 842;
  const contentWidth = pageWidth - 2 * margin;
  
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  
  const primaryColor = rgb(0.055, 0.647, 0.914); // #0EA5E9
  const darkBlue = rgb(0.008, 0.522, 0.780); // #0284C7
  const grayText = rgb(0.4, 0.4, 0.4);
  const darkText = rgb(0.2, 0.2, 0.2);
  
  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y < margin + requiredSpace) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };
  
  const drawText = (text: string, x: number, yPos: number, options: { font?: any; size?: number; color?: any } = {}) => {
    const usedFont = options.font || font;
    const size = options.size || fontSize;
    const color = options.color || darkText;
    
    // Truncate text if too long
    let displayText = text;
    const maxWidth = contentWidth - (x - margin);
    while (usedFont.widthOfTextAtSize(displayText, size) > maxWidth && displayText.length > 0) {
      displayText = displayText.slice(0, -1);
    }
    
    page.drawText(displayText, { x, y: yPos, size, font: usedFont, color });
  };
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('fr-FR', { 
        dateStyle: 'short', 
        timeStyle: 'short' 
      });
    } catch {
      return dateStr;
    }
  };

  // === HEADER STYLE FACTURE ===
  // Header background (simulated gradient with rectangle)
  page.drawRectangle({
    x: 0,
    y: pageHeight - 100,
    width: pageWidth,
    height: 100,
    color: primaryColor,
  });
  
  // Overlay for gradient effect
  page.drawRectangle({
    x: pageWidth / 2,
    y: pageHeight - 100,
    width: pageWidth / 2,
    height: 100,
    color: darkBlue,
  });
  
  // Title in header
  page.drawText('ANR', { 
    x: margin, 
    y: pageHeight - 45, 
    size: 28, 
    font: boldFont, 
    color: rgb(1, 1, 1) 
  });
  
  page.drawText('Export de vos données personnelles', { 
    x: margin, 
    y: pageHeight - 70, 
    size: 14, 
    font: font, 
    color: rgb(1, 1, 1) 
  });
  
  // Document reference on right
  page.drawText('Document RGPD', { 
    x: pageWidth - margin - 100, 
    y: pageHeight - 45, 
    size: 10, 
    font: font, 
    color: rgb(1, 1, 1) 
  });
  
  page.drawText('Article 15', { 
    x: pageWidth - margin - 100, 
    y: pageHeight - 60, 
    size: 12, 
    font: boldFont, 
    color: rgb(1, 1, 1) 
  });
  
  y = pageHeight - 130;
  
  // === INFO BOX ===
  // Light gray info box
  page.drawRectangle({
    x: margin,
    y: y - 60,
    width: contentWidth,
    height: 60,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.9, 0.9, 0.9),
    borderWidth: 1,
  });
  
  // User info in box
  y -= 20;
  drawText(`Utilisateur: ${data.profile?.first_name || ''} ${data.profile?.last_name || ''}`, margin + 15, y, { font: boldFont });
  y -= lineHeight;
  drawText(`Email: ${data.email}`, margin + 15, y);
  y -= lineHeight;
  drawText(`Date d'export: ${formatDate(data.export_date)}`, margin + 15, y);
  y -= lineHeight;
  
  // ID on right side
  page.drawText(`Réf: ${data.user_id?.substring(0, 8).toUpperCase() || 'N/A'}`, { 
    x: pageWidth - margin - 100, 
    y: y + lineHeight * 2, 
    size: 9, 
    font: font, 
    color: grayText 
  });
  
  y -= 30;
  
  // Profile section
  addNewPageIfNeeded(100);
  drawText('PROFIL', margin, y, { font: boldFont, size: headerSize, color: rgb(0.1, 0.3, 0.6) });
  y -= lineHeight * 1.5;
  
  if (data.profile) {
    drawText(`Prénom: ${data.profile.first_name || 'N/A'}`, margin + 10, y);
    y -= lineHeight;
    drawText(`Nom: ${data.profile.last_name || 'N/A'}`, margin + 10, y);
    y -= lineHeight;
    drawText(`Téléphone: ${data.profile.phone_number || 'N/A'}`, margin + 10, y);
    y -= lineHeight;
    drawText(`Téléphone vérifié: ${data.profile.phone_verified ? 'Oui' : 'Non'}`, margin + 10, y);
    y -= lineHeight;
    drawText(`Compte créé le: ${formatDate(data.profile.created_at)}`, margin + 10, y);
    y -= lineHeight * 2;
  }
  
  // Habitations section
  addNewPageIfNeeded(100);
  drawText('HABITATIONS', margin, y, { font: boldFont, size: headerSize, color: rgb(0.1, 0.3, 0.6) });
  y -= lineHeight * 1.5;
  
  if (data.habitations && data.habitations.length > 0) {
    for (const hab of data.habitations) {
      addNewPageIfNeeded(80);
      drawText(`• ${hab.name || 'Sans nom'}`, margin + 10, y, { font: boldFont });
      y -= lineHeight;
      drawText(`  Adresse: ${hab.address || 'N/A'}`, margin + 10, y);
      y -= lineHeight;
      drawText(`  Code ANR: ${hab.anr_code || 'N/A'}`, margin + 10, y);
      y -= lineHeight;
      drawText(`  Propriétaire: ${hab.is_owner ? 'Oui' : 'Non'} | Muté: ${hab.is_muted ? 'Oui' : 'Non'} | Statut: ${hab.status || 'N/A'}`, margin + 10, y);
      y -= lineHeight;
      drawText(`  Rejoint le: ${formatDate(hab.joined_at)}`, margin + 10, y);
      y -= lineHeight * 1.5;
    }
  } else {
    drawText('Aucune habitation', margin + 10, y);
    y -= lineHeight * 2;
  }
  
  // Subscriptions section
  addNewPageIfNeeded(80);
  drawText('ABONNEMENTS', margin, y, { font: boldFont, size: headerSize, color: rgb(0.1, 0.3, 0.6) });
  y -= lineHeight * 1.5;
  
  if (data.subscriptions && data.subscriptions.length > 0) {
    for (const sub of data.subscriptions) {
      addNewPageIfNeeded(60);
      drawText(`• Statut: ${sub.status || 'N/A'}`, margin + 10, y);
      y -= lineHeight;
      drawText(`  Période: ${formatDate(sub.period_start)} - ${formatDate(sub.period_end)}`, margin + 10, y);
      y -= lineHeight;
      drawText(`  Annulation programmée: ${sub.cancel_at_period_end ? 'Oui' : 'Non'}`, margin + 10, y);
      y -= lineHeight;
      drawText(`  Créé le: ${formatDate(sub.created_at)}`, margin + 10, y);
      y -= lineHeight * 1.5;
    }
  } else {
    drawText('Aucun abonnement', margin + 10, y);
    y -= lineHeight * 2;
  }
  
  // Call history section
  addNewPageIfNeeded(80);
  drawText('HISTORIQUE D\'APPELS (100 derniers)', margin, y, { font: boldFont, size: headerSize, color: rgb(0.1, 0.3, 0.6) });
  y -= lineHeight * 1.5;
  
  if (data.call_history && data.call_history.length > 0) {
    for (const call of data.call_history) {
      addNewPageIfNeeded(40);
      const duration = call.started_at && call.ended_at 
        ? Math.round((new Date(call.ended_at).getTime() - new Date(call.started_at).getTime()) / 1000) + 's'
        : 'N/A';
      drawText(`• ${formatDate(call.started_at)} | Statut: ${call.status} | Durée: ${duration}`, margin + 10, y);
      y -= lineHeight;
    }
    y -= lineHeight;
  } else {
    drawText('Aucun appel', margin + 10, y);
    y -= lineHeight * 2;
  }
  
  // Devices section
  addNewPageIfNeeded(60);
  drawText('APPAREILS ENREGISTRÉS', margin, y, { font: boldFont, size: headerSize, color: rgb(0.1, 0.3, 0.6) });
  y -= lineHeight * 1.5;
  
  if (data.devices && data.devices.length > 0) {
    for (const device of data.devices) {
      addNewPageIfNeeded(30);
      drawText(`• ${device.platform} - Enregistré le: ${formatDate(device.registered_at)}`, margin + 10, y);
      y -= lineHeight;
    }
    y -= lineHeight;
  } else {
    drawText('Aucun appareil', margin + 10, y);
    y -= lineHeight * 2;
  }
  
  // Data retention section
  addNewPageIfNeeded(100);
  drawText('POLITIQUE DE CONSERVATION', margin, y, { font: boldFont, size: headerSize, color: rgb(0.1, 0.3, 0.6) });
  y -= lineHeight * 1.5;
  
  if (data.data_retention_info) {
    for (const [key, value] of Object.entries(data.data_retention_info)) {
      addNewPageIfNeeded(30);
      const label = key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
      drawText(`• ${label}: ${value}`, margin + 10, y);
      y -= lineHeight;
    }
  }
  
  // Footer on last page
  y = margin;
  page.drawLine({
    start: { x: margin, y: y + 20 },
    end: { x: pageWidth - margin, y: y + 20 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8)
  });
  
  drawText('Ce document constitue la réponse officielle à votre demande d\'accès aux données conformément au RGPD.', margin, y + 5, { size: 8, color: rgb(0.5, 0.5, 0.5) });
  
  // Set PDF metadata and permissions (read-only)
  pdfDoc.setTitle('Export données personnelles ANR');
  pdfDoc.setAuthor('ANR');
  pdfDoc.setSubject('Export RGPD Article 15');
  pdfDoc.setCreator('ANR Application');
  pdfDoc.setProducer('ANR');
  pdfDoc.setCreationDate(new Date());
  pdfDoc.setModificationDate(new Date());
  
  return await pdfDoc.save();
}
