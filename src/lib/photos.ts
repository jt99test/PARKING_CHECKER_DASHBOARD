export interface MovementPhotoSource {
  photoUrl?: unknown;
  photoUrls?: unknown;
}

export function getMovementPhotoUrls(movement: MovementPhotoSource) {
  if (Array.isArray(movement.photoUrls)) {
    // photoUrls[0] is intentionally the user-selected primary image.
    const photoUrls = movement.photoUrls.filter(
      (photoUrl): photoUrl is string => typeof photoUrl === "string" && photoUrl.trim().length > 0,
    );

    if (photoUrls.length > 0) {
      return photoUrls;
    }
  }

  if (typeof movement.photoUrl === "string" && movement.photoUrl.trim()) {
    return [movement.photoUrl];
  }

  return [];
}
