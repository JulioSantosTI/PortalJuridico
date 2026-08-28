const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Soma N dias úteis a partir de uma data (pula sáb/dom).
// TODO: considerar calendário de feriados quando for definido.
export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start.getTime());
  let remaining = days;
  while (remaining > 0) {
    result.setTime(result.getTime() + MS_PER_DAY);
    if (!isWeekend(result)) {
      remaining -= 1;
    }
  }
  return result;
}

// Conta dias úteis entre duas datas (sinal negativo se `to` for antes de `from`).
export function businessDaysBetween(from: Date, to: Date): number {
  const sign = to.getTime() >= from.getTime() ? 1 : -1;
  const [start, end] = sign === 1 ? [from, to] : [to, from];

  let count = 0;
  const cursor = new Date(start.getTime());
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end.getTime());
  endDay.setHours(0, 0, 0, 0);

  while (cursor.getTime() < endDay.getTime()) {
    cursor.setTime(cursor.getTime() + MS_PER_DAY);
    if (!isWeekend(cursor)) {
      count += 1;
    }
  }
  return count * sign;
}

// Conta dias úteis restantes entre agora e a data limite (negativo se atrasado).
export function remainingBusinessDays(dueDate: Date, now: Date = new Date()): number {
  return businessDaysBetween(now, dueDate);
}
