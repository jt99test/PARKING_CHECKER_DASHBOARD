import { Timestamp, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";

export function timestampToDate(value: unknown): Date {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date();
}

export function mapFirestoreDates<T extends Record<string, unknown>>(
  data: T,
  fields: Array<keyof T>,
): T {
  return fields.reduce(
    (result, field) => ({
      ...result,
      [field]: timestampToDate(data[field]),
    }),
    data,
  );
}

export function docWithId<T extends DocumentData>(
  snapshot: QueryDocumentSnapshot<T>,
): T & { id: string } {
  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}
