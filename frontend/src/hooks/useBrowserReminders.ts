import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCalendarEvents } from "@/api/calendar";
import type { CalendarEvent } from "@/lib/types";

export function useNotificationPermission() {
  const [permission, setPermission] = React.useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  const requestPermission = React.useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  return { permission, requestPermission };
}

const CHECK_INTERVAL_MS = 15_000;
const REFETCH_INTERVAL_MS = 60_000;

// Roda em segundo plano (montado no AppShell, então funciona em qualquer tela do app)
// verificando os próprios compromissos e disparando uma notificação do navegador quando
// o horário do lembrete chegar. Só funciona com o app aberto numa aba — não é push real.
export function useBrowserReminders(enabled: boolean) {
  const notifiedRef = React.useRef<Set<string>>(new Set());
  const eventsRef = React.useRef<CalendarEvent[]>([]);

  const { data } = useQuery({
    queryKey: ["calendarEvents", "reminders"],
    queryFn: () => fetchCalendarEvents(),
    enabled,
    refetchInterval: enabled ? REFETCH_INTERVAL_MS : false,
  });

  React.useEffect(() => {
    eventsRef.current = data?.events ?? [];
  }, [data]);

  React.useEffect(() => {
    if (!enabled) return;

    const checkReminders = () => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const now = Date.now();

      for (const event of eventsRef.current) {
        if (!event.start || notifiedRef.current.has(event.id)) continue;
        const startMs = new Date(event.start).getTime();
        const reminderAt = startMs - event.reminderMinutes * 60_000;
        if (now >= reminderAt && now < startMs) {
          notifiedRef.current.add(event.id);
          new Notification(event.summary, {
            body: `Começa às ${new Date(event.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
          });
        }
      }
    };

    const interval = setInterval(checkReminders, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled]);
}
