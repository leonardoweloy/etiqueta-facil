const PROJECT_KEY = 'etiqueta-project';
const SCREEN_KEY = 'etiqueta-screen';
const DEFAULT_SCREEN_SCALE = 96 / 25.4;

/** Persists plain label DTOs using an injected Storage-compatible object. */
export class LocalStorageLabelRepository {
  constructor(storage) {
    this.storage = storage;
  }

  /** Return the stored DTO, or null when unavailable or invalid. */
  load() {
    try {
      const dto = JSON.parse(this.storage.getItem(PROJECT_KEY));
      if (dto && dto.width >= 5 && dto.width <= 300 &&
          dto.height >= 5 && dto.height <= 300 && Array.isArray(dto.items)) {
        return dto;
      }
    } catch {
      // Unavailable storage and malformed JSON both mean no saved project.
    }
    return null;
  }

  /** Storage errors propagate so the application can warn about lost saves. */
  save(dto) {
    this.storage.setItem(PROJECT_KEY, JSON.stringify(dto));
  }
}

export class ScreenCalibrationStore {
  constructor(storage) {
    this.storage = storage;
  }

  load() {
    try {
      const scale = Number(this.storage.getItem(SCREEN_KEY));
      if (scale > 0 && scale < 100) return scale;
    } catch {
      // Fall back to the browser's conventional CSS pixel density.
    }
    return DEFAULT_SCREEN_SCALE;
  }

  save(scale) {
    this.storage.setItem(SCREEN_KEY, String(scale));
  }

  reset() {
    this.storage.removeItem(SCREEN_KEY);
  }
}
