import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-drive-backup/callback`;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    // Route handling
    switch (path) {
      case 'auth-url':
        return handleAuthUrl(req);
      case 'callback':
        return handleCallback(req, url);
      case 'upload':
        return handleUpload(req);
      case 'download':
        return handleDownload(req);
      case 'list':
        return handleList(req);
      case 'disconnect':
        return handleDisconnect(req);
      case 'status':
        return handleStatus(req);
      default:
        return new Response(JSON.stringify({ error: 'Unknown endpoint' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Generate OAuth URL
async function handleAuthUrl(req: Request) {
  const { userId, redirectUrl } = await req.json();
  
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const state = btoa(JSON.stringify({ userId, redirectUrl }));
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.file email');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  console.log('Generated auth URL for user:', userId);

  return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handle OAuth callback
async function handleCallback(req: Request, url: URL) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    console.error('OAuth error:', error);
    return new Response(`<html><body><script>window.close();</script>Erreur: ${error}</body></html>`, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  if (!code || !state) {
    return new Response('<html><body><script>window.close();</script>Paramètres manquants</body></html>', {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  try {
    const { userId, redirectUrl } = JSON.parse(atob(state));
    console.log('Processing callback for user:', userId);

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });

    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      console.error('Token exchange error:', tokens);
      throw new Error(tokens.error_description || tokens.error);
    }

    console.log('Token exchange successful');

    // Get user email
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userInfo = await userInfoResponse.json();

    // Store tokens in database
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    
    const { error: dbError } = await supabaseAdmin
      .from('google_drive_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        google_email: userInfo.email
      }, { onConflict: 'user_id' });

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('Tokens stored for user:', userId, 'email:', userInfo.email);

    // Redirect back to app
    const finalRedirect = redirectUrl || '/backup';
    return new Response(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'google-drive-connected', email: '${userInfo.email}' }, '*');
              window.close();
            } else {
              window.location.href = '${finalRedirect}?connected=true';
            }
          </script>
          <p>Connexion réussie! Vous pouvez fermer cette fenêtre.</p>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });

  } catch (error: unknown) {
    console.error('Callback error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'google-drive-error', error: '${errorMessage}' }, '*');
              window.close();
            }
          </script>
          <p>Erreur: ${errorMessage}</p>
        </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html' } });
  }
}

// Refresh access token if needed
async function getValidAccessToken(userId: string): Promise<string> {
  const { data: tokenData, error } = await supabaseAdmin
    .from('google_drive_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !tokenData) {
    throw new Error('Non connecté à Google Drive');
  }

  const expiresAt = new Date(tokenData.token_expires_at);
  
  // Refresh if expires in less than 5 minutes
  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    console.log('Refreshing token for user:', userId);
    
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: tokenData.refresh_token,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token'
      })
    });

    const newTokens = await refreshResponse.json();
    
    if (newTokens.error) {
      console.error('Token refresh error:', newTokens);
      // Delete invalid tokens
      await supabaseAdmin.from('google_drive_tokens').delete().eq('user_id', userId);
      throw new Error('Session expirée, veuillez vous reconnecter');
    }

    const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
    
    await supabaseAdmin
      .from('google_drive_tokens')
      .update({
        access_token: newTokens.access_token,
        token_expires_at: newExpiresAt.toISOString()
      })
      .eq('user_id', userId);

    return newTokens.access_token;
  }

  return tokenData.access_token;
}

// Get or create backup folder
async function getBackupFolder(accessToken: string): Promise<string> {
  const folderName = '.anr-backup';
  
  // Search for existing folder
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  const searchResult = await searchResponse.json();
  
  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }

  // Create folder
  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  const folder = await createResponse.json();
  console.log('Created backup folder:', folder.id);
  return folder.id;
}

// Upload backup
async function handleUpload(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { userId, backupData, filename } = await req.json();
  
  if (!userId || !backupData) {
    return new Response(JSON.stringify({ error: 'userId and backupData required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log('Uploading backup for user:', userId);

  const accessToken = await getValidAccessToken(userId);
  const folderId = await getBackupFolder(accessToken);
  
  const finalFilename = filename || `anr-backup-${new Date().toISOString().split('T')[0]}.anr-backup`;

  // Delete existing file with same name
  const existingFiles = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${finalFilename}' and '${folderId}' in parents and trashed=false`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const existing = await existingFiles.json();
  
  for (const file of existing.files || []) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }

  // Upload new file using multipart upload
  const boundary = '-------314159265358979323846';
  const metadata = {
    name: finalFilename,
    parents: [folderId],
    mimeType: 'application/octet-stream'
  };

  const body = 
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n' +
    `--${boundary}\r\n` +
    'Content-Type: application/octet-stream\r\n\r\n' +
    backupData + '\r\n' +
    `--${boundary}--`;

  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    }
  );

  const uploadResult = await uploadResponse.json();
  
  if (uploadResult.error) {
    console.error('Upload error:', uploadResult);
    throw new Error(uploadResult.error.message);
  }

  console.log('Backup uploaded:', uploadResult.id);

  return new Response(JSON.stringify({ 
    success: true, 
    fileId: uploadResult.id,
    filename: finalFilename 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Download backup
async function handleDownload(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { userId, fileId } = await req.json();
  
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log('Downloading backup for user:', userId);

  const accessToken = await getValidAccessToken(userId);
  
  let targetFileId = fileId;
  
  // If no fileId, get the latest backup
  if (!targetFileId) {
    const folderId = await getBackupFolder(accessToken);
    const filesResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&orderBy=createdTime desc&pageSize=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const files = await filesResponse.json();
    
    if (!files.files || files.files.length === 0) {
      return new Response(JSON.stringify({ error: 'Aucune sauvegarde trouvée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    targetFileId = files.files[0].id;
  }

  // Download file content
  const downloadResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${targetFileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const content = await downloadResponse.text();

  return new Response(JSON.stringify({ 
    success: true, 
    backupData: content 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// List backups
async function handleList(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { userId } = await req.json();
  
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const accessToken = await getValidAccessToken(userId);
  const folderId = await getBackupFolder(accessToken);

  const filesResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&orderBy=createdTime desc&fields=files(id,name,createdTime,size)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  const files = await filesResponse.json();

  return new Response(JSON.stringify({ 
    success: true, 
    backups: files.files || [] 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Disconnect
async function handleDisconnect(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { userId } = await req.json();
  
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { error } = await supabaseAdmin
    .from('google_drive_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Disconnect error:', error);
    throw error;
  }

  console.log('Disconnected user:', userId);

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Check connection status
async function handleStatus(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { userId } = await req.json();
  
  if (!userId) {
    return new Response(JSON.stringify({ error: 'userId required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data, error } = await supabaseAdmin
    .from('google_drive_tokens')
    .select('google_email, token_expires_at')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return new Response(JSON.stringify({ 
      connected: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ 
    connected: true,
    email: data.google_email,
    expiresAt: data.token_expires_at
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
