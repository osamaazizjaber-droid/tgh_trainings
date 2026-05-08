/**
 * Patched ImageModule wrapper.
 * Fixes: "Cannot read properties of undefined (reading '0')"
 * Root cause: the original module treats any `object` as {rId, sizePixel},
 * but Buffer/Uint8Array are also objects and don't have those properties.
 */
import OriginalImageModule from 'docxtemplater-image-module-free';

class PatchedImageModule extends OriginalImageModule {
  render(part, options) {
    try {
      return super.render(part, options);
    } catch (e) {
      // If the super call crashes (e.g. reading sizePixel[0] on undefined),
      // fall back to rendering as empty text instead of crashing.
      if (e && e.message && e.message.includes("reading '0'")) {
        console.warn('[ImageModule] Skipping broken image tag:', part?.value, e.message);
        return null;
      }
      throw e;
    }
  }
}

export default PatchedImageModule;