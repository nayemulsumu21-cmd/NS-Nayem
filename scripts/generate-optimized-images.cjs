const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const uploadsDir = path.resolve('public/images/uploads');
const optimizedDir = path.resolve('public/images/optimized');

if (!fs.existsSync(optimizedDir)) {
  fs.mkdirSync(optimizedDir, { recursive: true });
}

// Target responsive widths (never upscales beyond native width)
const TARGET_WIDTHS = [480, 800, 1200, 1600, 2400, 3200];

async function processImage(file, index, total) {
  const srcPath = path.join(uploadsDir, file);
  const parsed = path.parse(file);
  const ext = parsed.ext.toLowerCase();

  try {
    const metadata = await sharp(srcPath).metadata();
    const origWidth = metadata.width || 0;
    const origHeight = metadata.height || 0;

    if (!origWidth || !origHeight) {
      console.warn(`Skipping ${file}: invalid dimensions.`);
      return null;
    }

    const applicableWidths = TARGET_WIDTHS.filter((w) => w < origWidth);
    applicableWidths.push(origWidth);

    const sortedWidths = Array.from(new Set(applicableWidths)).sort((a, b) => a - b);

    console.log(`[${index + 1}/${total}] Optimizing ${file} (${origWidth}x${origHeight})...`);

    for (const w of sortedWidths) {
      const isOriginalSize = w === origWidth;
      const resizeOptions = isOriginalSize
        ? null
        : {
            width: w,
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3,
          };

      // 1. WebP Variant (Sharp, Fast, 99%+ browser support)
      const webpDest = path.join(optimizedDir, `${parsed.name}-${w}.webp`);
      if (!fs.existsSync(webpDest)) {
        let pipeline = sharp(srcPath);
        if (resizeOptions) pipeline = pipeline.resize(resizeOptions);
        await pipeline
          .webp({
            quality: 92,
            effort: 4,
            smartSubsample: false,
          })
          .toFile(webpDest);
      }

      // 2. AVIF Variant (Thumbnails & medium sizes <= 1200w)
      if (w <= 1200) {
        const avifDest = path.join(optimizedDir, `${parsed.name}-${w}.avif`);
        if (!fs.existsSync(avifDest)) {
          let pipeline = sharp(srcPath);
          if (resizeOptions) pipeline = pipeline.resize(resizeOptions);
          await pipeline
            .avif({
              quality: 86,
              effort: 3,
              chromaSubsampling: '4:4:4',
            })
            .toFile(avifDest);
        }
      }

      // 3. Fallback JPEG/PNG Variant
      const fallbackExt = ext === '.png' ? '.png' : '.jpg';
      const fallbackDest = path.join(optimizedDir, `${parsed.name}-${w}${fallbackExt}`);
      if (!fs.existsSync(fallbackDest)) {
        let pipeline = sharp(srcPath);
        if (resizeOptions) pipeline = pipeline.resize(resizeOptions);
        if (fallbackExt === '.png') {
          await pipeline
            .png({
              compressionLevel: 7,
              adaptiveFiltering: true,
            })
            .toFile(fallbackDest);
        } else {
          await pipeline
            .jpeg({
              quality: 90,
              chromaSubsampling: '4:4:4',
            })
            .toFile(fallbackDest);
        }
      }
    }

    return {
      file,
      entry: {
        origWidth,
        origHeight,
        aspectRatio: origWidth / origHeight,
        widths: sortedWidths,
        hasWebp: true,
        hasAvif: true,
      },
    };
  } catch (err) {
    console.error(`Error processing ${file}:`, err.message);
    return null;
  }
}

async function runPool(items, limit, fn) {
  const results = [];
  const executing = new Set();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const p = Promise.resolve().then(() => fn(item, i, items.length));
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

async function main() {
  const files = fs.readdirSync(uploadsDir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  console.log(`Running optimized parallel generation on ${files.length} images...`);

  const results = await runPool(files, 3, processImage);

  const manifest = {};
  for (const res of results) {
    if (res && res.file) {
      manifest[res.file] = res.entry;
    }
  }

  const manifestPath = path.join(optimizedDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Successfully generated variants! Manifest saved: ${manifestPath}`);
}

main().catch(console.error);
