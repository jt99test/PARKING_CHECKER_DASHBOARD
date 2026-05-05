import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function formatDateTime(date: Date): string {
  return format(date, "dd/MM/yyyy HH:mm", { locale: es });
}

export function formatTimeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true, locale: es });
}

export function formatDateForFile(date: Date): string {
  return format(date, "yyyy-MM-dd", { locale: es });
}
