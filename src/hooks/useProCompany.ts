import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ProCompany {
  id: string;
  name: string;
  legal_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  siret: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  plan_type: string | null;
  max_employees: number;
  is_active: boolean;
  require_face_recognition_default: boolean;
  enable_gps_tracking: boolean;
  enable_client_signature: boolean;
  auto_clockout_minutes: number;
}

export interface ProEmployee {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  employee_number: string | null;
  role: string | null;
  department: string | null;
  is_active: boolean;
  user_id: string | null;
  photo_url: string | null;
  created_at: string;
  last_activity_at: string | null;
}

export interface ProSchedule {
  id: string;
  name: string;
  anr_id: string;
  granted_to_company: string | null;
  days_of_week: number[];
  time_from: string;
  time_to: string;
  valid_from: string | null;
  valid_until: string | null;
  require_face_recognition_entry: boolean;
  require_face_recognition_exit: boolean;
  is_active: boolean;
  anr?: { code: string; address: string };
}

export interface ProAssignment {
  id: string;
  employee_id: string;
  schedule_id: string;
  assigned_date: string;
  status: string;
  time_from: string | null;
  time_to: string | null;
  entry_at: string | null;
  exit_at: string | null;
  duration_minutes: number | null;
  client_signature: string | null;
  resident_rating: number | null;
  employee?: ProEmployee;
  schedule?: ProSchedule;
}

export const useProCompany = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's company role
  const { data: companyRole } = useQuery({
    queryKey: ['pro_company_role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('pro_company_roles')
        .select('*, company:pro_companies(*)')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const company = companyRole?.company as ProCompany | null;
  const userRole = companyRole?.role;

  // Fetch employees
  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['pro_employees', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('pro_employees')
        .select('*')
        .eq('company_id', company.id)
        .order('last_name');
      if (error) throw error;
      return data as ProEmployee[];
    },
    enabled: !!company?.id,
  });

  // Fetch schedules granted to company
  const { data: schedules, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ['pro_schedules', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from('door_scheduled_access')
        .select('*, anr:anrs(code, address)')
        .eq('granted_to_company', company.id)
        .order('name');
      if (error) throw error;
      return data as ProSchedule[];
    },
    enabled: !!company?.id,
  });

  // Fetch today's assignments
  const { data: todayAssignments, isLoading: isLoadingAssignments } = useQuery({
    queryKey: ['pro_assignments_today', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('pro_employee_assignments')
        .select('*, employee:pro_employees(*)')
        .eq('company_id', company.id)
        .eq('assigned_date', today)
        .order('time_from');
      if (error) throw error;
      return data as ProAssignment[];
    },
    enabled: !!company?.id,
  });

  // Stats
  const stats = {
    totalEmployees: employees?.filter(e => e.is_active).length || 0,
    activeSchedules: schedules?.filter(s => s.is_active).length || 0,
    todayAssignments: todayAssignments?.length || 0,
    completedToday: todayAssignments?.filter(a => a.status === 'completed').length || 0,
    inProgressToday: todayAssignments?.filter(a => a.status === 'in_progress').length || 0,
  };

  // Add employee
  const addEmployee = useMutation({
    mutationFn: async (employee: { first_name: string; last_name: string; email?: string | null; phone?: string | null; employee_number?: string | null; role?: string | null; department?: string | null; is_active?: boolean }) => {
      if (!company?.id) throw new Error("No company");
      const { data, error } = await supabase
        .from('pro_employees')
        .insert([{ 
          first_name: employee.first_name,
          last_name: employee.last_name,
          email: employee.email,
          phone: employee.phone,
          employee_number: employee.employee_number,
          role: employee.role,
          department: employee.department,
          is_active: employee.is_active ?? true,
          company_id: company.id 
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pro_employees'] });
      toast.success("Employé ajouté");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update employee
  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProEmployee> & { id: string }) => {
      const { error } = await supabase
        .from('pro_employees')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pro_employees'] });
      toast.success("Employé mis à jour");
    },
  });

  // Create assignment
  const createAssignment = useMutation({
    mutationFn: async (assignment: { employee_id: string; schedule_id: string; assigned_date: string; time_from?: string; time_to?: string }) => {
      if (!company?.id) throw new Error("No company");
      const { data, error } = await supabase
        .from('pro_employee_assignments')
        .insert([{ 
          employee_id: assignment.employee_id,
          schedule_id: assignment.schedule_id,
          assigned_date: assignment.assigned_date,
          time_from: assignment.time_from,
          time_to: assignment.time_to,
          company_id: company.id 
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pro_assignments'] });
      toast.success("Mission assignée");
    },
  });

  return {
    company,
    userRole,
    employees: employees || [],
    schedules: schedules || [],
    todayAssignments: todayAssignments || [],
    stats,
    isLoading: isLoadingEmployees || isLoadingSchedules || isLoadingAssignments,
    addEmployee: addEmployee.mutate,
    updateEmployee: updateEmployee.mutate,
    createAssignment: createAssignment.mutate,
    isAdmin: userRole === 'owner' || userRole === 'admin',
  };
};
