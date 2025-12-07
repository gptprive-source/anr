import { useState } from "react";
import { useProCompany, ProSchedule, ProEmployee } from "@/hooks/useProCompany";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AssignEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedSchedule?: ProSchedule;
}

export const AssignEmployeeDialog = ({ 
  open, 
  onOpenChange,
  preselectedSchedule 
}: AssignEmployeeDialogProps) => {
  const { employees, schedules, createAssignment } = useProCompany();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedSchedule, setSelectedSchedule] = useState<string>(preselectedSchedule?.id || "");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [timeFrom, setTimeFrom] = useState<string>("");
  const [timeTo, setTimeTo] = useState<string>("");

  const activeEmployees = employees.filter(e => e.is_active);
  const activeSchedules = schedules.filter(s => s.is_active);

  const currentSchedule = activeSchedules.find(s => s.id === selectedSchedule);

  // Auto-fill times from schedule
  const handleScheduleChange = (scheduleId: string) => {
    setSelectedSchedule(scheduleId);
    const schedule = activeSchedules.find(s => s.id === scheduleId);
    if (schedule) {
      setTimeFrom(schedule.time_from.slice(0, 5));
      setTimeTo(schedule.time_to.slice(0, 5));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployee || !selectedSchedule || !selectedDate) {
      return;
    }

    setIsSubmitting(true);
    try {
      createAssignment({
        employee_id: selectedEmployee,
        schedule_id: selectedSchedule,
        assigned_date: format(selectedDate, 'yyyy-MM-dd'),
        time_from: timeFrom || undefined,
        time_to: timeTo || undefined,
      });
      
      // Reset form
      setSelectedEmployee("");
      setSelectedSchedule("");
      setSelectedDate(new Date());
      setTimeFrom("");
      setTimeTo("");
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Planifier une mission</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Employé *</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un employé" />
              </SelectTrigger>
              <SelectContent>
                {activeEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                    {emp.role && <span className="text-muted-foreground ml-2">({emp.role})</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Schedule/Authorization Selection */}
          <div className="space-y-2">
            <Label>Autorisation client *</Label>
            <Select value={selectedSchedule} onValueChange={handleScheduleChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une autorisation" />
              </SelectTrigger>
              <SelectContent>
                {activeSchedules.map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    <div className="flex flex-col">
                      <span>{schedule.name}</span>
                      {schedule.anr && (
                        <span className="text-xs text-muted-foreground">
                          {schedule.anr.address}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Schedule info display */}
          {currentSchedule && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{currentSchedule.anr?.address || "Adresse non définie"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  Plage autorisée: {currentSchedule.time_from.slice(0, 5)} - {currentSchedule.time_to.slice(0, 5)}
                </span>
              </div>
              {currentSchedule.require_face_recognition_entry && (
                <p className="text-xs text-muted-foreground">
                  ⚠️ Reconnaissance faciale requise à l'entrée
                </p>
              )}
            </div>
          )}

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Date de la mission *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : "Choisir une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={fr}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="time_from">Heure début</Label>
              <Input
                id="time_from"
                type="time"
                value={timeFrom}
                onChange={(e) => setTimeFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time_to">Heure fin</Label>
              <Input
                id="time_to"
                type="time"
                value={timeTo}
                onChange={(e) => setTimeTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !selectedEmployee || !selectedSchedule || !selectedDate}
            >
              {isSubmitting ? "Planification..." : "Planifier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
