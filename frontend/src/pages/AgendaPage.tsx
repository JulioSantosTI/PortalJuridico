import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/api/client";
import { createCalendarEvent, deleteCalendarEvent, fetchCalendarEvents, updateCalendarEvent } from "@/api/calendar";
import { fetchColaboradores } from "@/api/users";
import { useNotificationPermission } from "@/hooks/useBrowserReminders";
import type { CalendarEvent } from "@/lib/types";

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Converte um ISO (UTC) para o formato que <input type="datetime-local"> espera,
// já no horário local do navegador.
function toDateTimeLocalValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = { summary: "", description: "", startDateTime: "", endDateTime: "", reminderMinutes: 30 };

export function AgendaPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedColaboradorId, setSelectedColaboradorId] = React.useState<string>(user?.id ?? "");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(null);
  const { permission, requestPermission } = useNotificationPermission();

  const [form, setForm] = React.useState(emptyForm);

  const { data: colaboradoresData } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: fetchColaboradores,
    enabled: user?.role === "GESTOR",
  });
  const colaboradores = colaboradoresData?.colaboradores ?? [];

  const isOwnAgenda = selectedColaboradorId === user?.id;

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["calendarEvents", selectedColaboradorId],
    queryFn: () => fetchCalendarEvents(user?.role === "GESTOR" ? selectedColaboradorId : undefined),
    enabled: Boolean(selectedColaboradorId),
  });
  const events = eventsData?.events ?? [];

  function closeDialog() {
    setDialogOpen(false);
    setEditingEvent(null);
    setForm(emptyForm);
  }

  const createMutation = useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: () => {
      toast.success("Compromisso criado.");
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível criar o compromisso.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Parameters<typeof updateCalendarEvent>[1]) =>
      updateCalendarEvent(id, payload),
    onSuccess: () => {
      toast.success("Compromisso atualizado.");
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível atualizar o compromisso.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCalendarEvent,
    onSuccess: () => {
      toast.success("Compromisso removido.");
      queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível remover o compromisso.");
    },
  });

  function openCreateDialog() {
    setEditingEvent(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(event: CalendarEvent) {
    setEditingEvent(event);
    setForm({
      summary: event.summary,
      description: event.description ?? "",
      startDateTime: event.start ? toDateTimeLocalValue(event.start) : "",
      endDateTime: event.end ? toDateTimeLocalValue(event.end) : "",
      reminderMinutes: event.reminderMinutes,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.startDateTime || !form.endDateTime) {
      toast.error("Preencha início e fim do compromisso.");
      return;
    }
    const payload = {
      summary: form.summary,
      description: form.description || undefined,
      startDateTime: new Date(form.startDateTime).toISOString(),
      endDateTime: new Date(form.endDateTime).toISOString(),
      reminderMinutes: form.reminderMinutes,
    };
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground">Compromissos e reuniões, com lembrete no navegador.</p>
        </div>
        <div className="flex items-center gap-3">
          {permission !== "granted" && (
            <Button variant="outline" size="sm" onClick={requestPermission}>
              <Bell /> Ativar notificações
            </Button>
          )}
          {user?.role === "GESTOR" && (
            <Select value={selectedColaboradorId} onValueChange={setSelectedColaboradorId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Escolher agenda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={user.id}>Minha agenda</SelectItem>
                {colaboradores
                  .filter((c) => c.id !== user.id)
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
          {isOwnAgenda && (
            <Button onClick={openCreateDialog}>
              <Plus /> Novo compromisso
            </Button>
          )}
        </div>
      </div>

      {eventsLoading ? (
        <p className="text-sm text-muted-foreground">Carregando compromissos...</p>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhum compromisso nos próximos 30 dias.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id} className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
              <div className="min-w-0">
                <p className="font-medium">{event.summary}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(event.start)} — {formatDateTime(event.end)}
                </p>
                {event.description && <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>}
              </div>
              {isOwnAgenda && (
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={() => openEditDialog(event)}
                    className="text-muted-foreground hover:text-primary"
                    title="Editar compromisso"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(event.id)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Remover compromisso"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="summary">Título *</Label>
              <Input
                id="summary"
                required
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="start">Início *</Label>
                <Input
                  id="start"
                  type="datetime-local"
                  required
                  value={form.startDateTime}
                  onChange={(e) => setForm((f) => ({ ...f, startDateTime: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="end">Fim *</Label>
                <Input
                  id="end"
                  type="datetime-local"
                  required
                  value={form.endDateTime}
                  onChange={(e) => setForm((f) => ({ ...f, endDateTime: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reminder">Lembrete (minutos antes)</Label>
              <Input
                id="reminder"
                type="number"
                min={0}
                value={form.reminderMinutes}
                onChange={(e) => setForm((f) => ({ ...f, reminderMinutes: Number(e.target.value) }))}
              />
              {permission !== "granted" && (
                <p className="text-xs text-muted-foreground">
                  Clique em "Ativar notificações" no topo da página para receber o aviso no navegador.
                </p>
              )}
            </div>
            <Button type="submit" disabled={isSaving} className="self-start">
              {editingEvent ? "Salvar alterações" : "Criar compromisso"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
