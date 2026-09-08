import { apiRequest } from "./client";
import type { CalendarEvent, CalendarStatus } from "@/lib/types";

export function fetchCalendarStatus() {
  return apiRequest<CalendarStatus>("/calendar/status");
}

export function fetchGoogleOAuthUrl() {
  return apiRequest<{ url: string }>("/calendar/oauth/url");
}

export function disconnectCalendar() {
  return apiRequest<void>("/calendar/disconnect", { method: "DELETE" });
}

export function fetchCalendarEvents(colaboradorId?: string) {
  return apiRequest<{ events: CalendarEvent[] }>("/calendar/events", { query: { colaboradorId } });
}

export interface CreateEventPayload {
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  reminderMinutes?: number;
}

export function createCalendarEvent(payload: CreateEventPayload) {
  return apiRequest<{ event: CalendarEvent }>("/calendar/events", { method: "POST", body: payload });
}

export function deleteCalendarEvent(eventId: string) {
  return apiRequest<void>(`/calendar/events/${eventId}`, { method: "DELETE" });
}

export type UpdateEventPayload = Partial<CreateEventPayload>;

export function updateCalendarEvent(eventId: string, payload: UpdateEventPayload) {
  return apiRequest<{ event: CalendarEvent }>(`/calendar/events/${eventId}`, { method: "PATCH", body: payload });
}
