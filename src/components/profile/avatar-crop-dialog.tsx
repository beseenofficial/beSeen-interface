'use client';

import { ImageIcon, X } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Button } from '@/components/ui/button';

const CROP_SIZE = 320;
const OUTPUT_SIZE = 512;

type Position = { x: number; y: number };

type Props = {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

function clampPosition(
  position: Position,
  dimensions: { width: number; height: number },
  zoom: number,
  cropSize: number,
): Position {
  const baseScale = Math.max(cropSize / dimensions.width, cropSize / dimensions.height);
  const renderedWidth = dimensions.width * baseScale * zoom;
  const renderedHeight = dimensions.height * baseScale * zoom;
  const maxX = Math.max(0, (renderedWidth - cropSize) / 2);
  const maxY = Math.max(0, (renderedHeight - cropSize) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, position.x)),
    y: Math.min(maxY, Math.max(-maxY, position.y)),
  };
}

export function AvatarCropDialog({ file, onCancel, onConfirm }: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  const cropAreaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; origin: Position } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [imageUrl, setImageUrl] = useState('');
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropSize, setCropSize] = useState(CROP_SIZE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextImageUrl = URL.createObjectURL(file);
    setImageUrl(nextImageUrl);
    return () => URL.revokeObjectURL(nextImageUrl);
  }, [file]);

  useEffect(() => {
    const cropArea = cropAreaRef.current;
    if (!cropArea) return;
    const updateSize = () => setCropSize(cropArea.clientWidth);
    updateSize();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(cropArea);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onCancel]);

  const baseScale = dimensions.width
    ? Math.max(cropSize / dimensions.width, cropSize / dimensions.height)
    : 1;
  const renderedWidth = dimensions.width * baseScale * zoom;
  const renderedHeight = dimensions.height * baseScale * zoom;

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dimensions.width) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      origin: position,
    };
  }

  function moveImage(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPosition(
      clampPosition(
        {
          x: drag.origin.x + event.clientX - drag.x,
          y: drag.origin.y + event.clientY - drag.y,
        },
        dimensions,
        zoom,
        cropSize,
      ),
    );
  }

  function stopDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function changeZoom(nextZoom: number) {
    setZoom(nextZoom);
    setPosition((current) => clampPosition(current, dimensions, nextZoom, cropSize));
  }

  async function saveCrop() {
    const image = imageRef.current;
    if (!image || !dimensions.width || saving) return;
    setSaving(true);
    setError(null);
    try {
      const scale = baseScale * zoom;
      const sourceSize = cropSize / scale;
      const sourceX = dimensions.width / 2 - sourceSize / 2 - position.x / scale;
      const sourceY = dimensions.height / 2 - sourceSize / 2 - position.y / scale;
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image cropping is not supported in this browser.');
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => result ? resolve(result) : reject(new Error('The cropped image could not be created.')),
          'image/webp',
          0.9,
        );
      });
      const filename = `${file.name.replace(/\.[^.]+$/, '') || 'avatar'}-cropped.webp`;
      onConfirm(new File([blob], filename, { type: 'image/webp' }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The cropped image could not be created.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="crop-title">
      <section className="w-full max-w-115 rounded-3xl border border-white/80 bg-white p-5 shadow-[0_28px_90px_rgb(11_11_63/28%)] sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="crop-title" className="text-2xl font-semibold">Crop your profile image</h2>
            <p className="mt-2 text-sm text-secondary">Drag to reposition, then zoom until it looks right.</p>
          </div>
          <button className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-border bg-white text-muted hover:bg-subtle" type="button" onClick={onCancel} aria-label="Close image cropper">
            <X size={19} aria-hidden="true" />
          </button>
        </div>

        <div ref={cropAreaRef} className="mx-auto mt-6 aspect-square w-full max-w-80 cursor-move touch-none overflow-hidden rounded-full bg-[#e8eef1]" onPointerDown={startDrag} onPointerMove={moveImage} onPointerUp={stopDrag} onPointerCancel={stopDrag}>
          <div className="relative size-full overflow-hidden">
            <img
              ref={imageRef}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              src={imageUrl || undefined}
              alt="Profile crop preview"
              draggable={false}
              onLoad={(event) => setDimensions({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
              style={{
                width: renderedWidth || undefined,
                height: renderedHeight || undefined,
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
              }}
            />
            <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/85 shadow-[inset_0_0_0_1px_rgb(11_11_63/18%)]" aria-hidden="true" />
          </div>
        </div>

        <label className="mt-5 grid gap-2 text-sm font-semibold">
          Zoom
          <div className="flex items-center gap-3 text-muted">
            <ImageIcon size={17} aria-hidden="true" />
            <input className="w-full accent-brand" type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => changeZoom(Number(event.target.value))} />
            <ImageIcon size={24} aria-hidden="true" />
          </div>
        </label>

        {error && <p className="mt-4 rounded-xl bg-error-bg p-3 text-sm text-error" role="alert">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button type="button" loading={saving} onClick={() => void saveCrop()}>Use this crop</Button>
        </div>
      </section>
    </div>
  );
}
