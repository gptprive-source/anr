import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface SecurityAuditRun {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  total_issues: number;
  critical_issues: number;
  warning_issues: number;
  triggered_by: string | null;
  trigger_type: 'manual' | 'scheduled';
}

interface SecurityAuditResult {
  id: string;
  run_id: string;
  check_type: string;
  severity: 'critical' | 'warning' | 'info';
  table_name: string | null;
  policy_name: string | null;
  description: string;
  recommendation: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export const useSecurityAudit = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch latest audit run
  const { data: latestRun, isLoading: isLoadingRun } = useQuery({
    queryKey: ['security_audit_latest_run'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_audit_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as SecurityAuditRun | null;
    },
  });

  // Fetch audit history
  const { data: auditHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['security_audit_history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_audit_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as SecurityAuditRun[];
    },
  });

  // Fetch current issues (from latest completed run)
  const { data: currentIssues, isLoading: isLoadingIssues } = useQuery({
    queryKey: ['security_audit_issues', latestRun?.id],
    queryFn: async () => {
      if (!latestRun?.id || latestRun.status !== 'completed') return [];

      const { data, error } = await supabase
        .from('security_audit_results')
        .select('*')
        .eq('run_id', latestRun.id)
        .order('severity', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as SecurityAuditResult[];
    },
    enabled: !!latestRun?.id,
  });

  // Trigger manual audit
  const triggerAudit = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('security-audit', {
        body: {
          user_id: user?.id,
          trigger_type: 'manual'
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security_audit_latest_run'] });
      queryClient.invalidateQueries({ queryKey: ['security_audit_history'] });
      queryClient.invalidateQueries({ queryKey: ['security_audit_issues'] });
    },
  });

  // Mark issue as resolved
  const resolveIssue = useMutation({
    mutationFn: async (issueId: string) => {
      const { error } = await supabase
        .from('security_audit_results')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id
        })
        .eq('id', issueId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security_audit_issues'] });
    },
  });

  // Calculate security score
  const calculateScore = () => {
    if (!currentIssues || currentIssues.length === 0) return 100;

    const unresolvedIssues = currentIssues.filter(i => !i.is_resolved);
    const criticalCount = unresolvedIssues.filter(i => i.severity === 'critical').length;
    const warningCount = unresolvedIssues.filter(i => i.severity === 'warning').length;

    // Score calculation: start at 100, deduct points for issues
    let score = 100;
    score -= criticalCount * 20; // -20 per critical issue
    score -= warningCount * 5;   // -5 per warning

    return Math.max(0, score);
  };

  return {
    latestRun,
    auditHistory,
    currentIssues,
    isLoading: isLoadingRun || isLoadingHistory || isLoadingIssues,
    triggerAudit: triggerAudit.mutate,
    isTriggering: triggerAudit.isPending,
    resolveIssue: resolveIssue.mutate,
    isResolving: resolveIssue.isPending,
    securityScore: calculateScore(),
    unresolvedCount: currentIssues?.filter(i => !i.is_resolved).length || 0,
    criticalCount: currentIssues?.filter(i => i.severity === 'critical' && !i.is_resolved).length || 0,
  };
};
