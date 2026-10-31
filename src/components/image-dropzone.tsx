"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UploadedImage {
  id: string;
  file?: File;
  previewUrl: string;
  storagePath?: string;
  sortOrder: number;
}

interface ImageDropzoneProps {
  userId: string;
  listingId?: string;
  initialImages?: { id: string; storage_path: string; sort_order: number }[];
  onImagesChange: (paths: string[]) => void;
}

/**
 * Resizes and compresses an image in browser using HTML5 Canvas to 80% WebP (max 1600px).
 * Eliminates rural mobile bandwidth upload bottlenecks (TR-01).
 */
async function compressImageToWebP(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const maxDim = 1600;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("WebP compression failed"));
        },
        "image/webp",
        0.8
      );
    };

    img.onerror = (err) => reject(err);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export function ImageDropzone({
  userId,
  listingId,
  initialImages = [],
  onImagesChange,
}: ImageDropzoneProps) {
  const [images, setImages] = useState<UploadedImage[]>(() =>
    initialImages.map((img) => ({
      id: img.id,
      previewUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${img.storage_path}`,
      storagePath: img.storage_path,
      sortOrder: img.sort_order,
    }))
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fallbackFolderIdRef = useRef<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const availableSlots = 5 - images.length;
    if (availableSlots <= 0) {
      setUploadError("Maximum 5 photographs allowed per listing.");
      return;
    }

    const filesToUpload = Array.from(files).slice(0, availableSlots);
    setIsUploading(true);

    try {
      const supabase = createClient();
      const updatedList = [...images];
      const activeFolderId =
        listingId ||
        fallbackFolderIdRef.current ||
        (fallbackFolderIdRef.current = crypto.randomUUID());

      for (const file of filesToUpload) {
        // Compress to WebP
        const compressedBlob = await compressImageToWebP(file);
        const imageUuid = crypto.randomUUID();
        const storagePath = `listings/${userId}/${activeFolderId}/${imageUuid}.webp`;

        // Upload to Supabase Storage listing-images bucket
        const { error } = await supabase.storage
          .from("listing-images")
          .upload(storagePath, compressedBlob, {
            contentType: "image/webp",
            upsert: false,
          });

        if (error) {
          throw new Error(`Upload failed: ${error.message}`);
        }

        const newSortOrder = updatedList.length;
        updatedList.push({
          id: imageUuid,
          previewUrl: URL.createObjectURL(compressedBlob),
          storagePath,
          sortOrder: newSortOrder,
        });
      }

      setImages(updatedList);
      onImagesChange(updatedList.map((img) => img.storagePath!).filter(Boolean));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeImage = (indexToRemove: number) => {
    const updated = images
      .filter((_, idx) => idx !== indexToRemove)
      .map((img, idx) => ({ ...img, sortOrder: idx }));

    setImages(updated);
    onImagesChange(updated.map((img) => img.storagePath!).filter(Boolean));
  };

  const setCoverImage = (indexToCover: number) => {
    if (indexToCover === 0) return;
    const target = images[indexToCover];
    if (!target) return;

    const remaining = images.filter((_, idx) => idx !== indexToCover);
    const reordered = [target, ...remaining].map((img, idx) => ({
      ...img,
      sortOrder: idx,
    }));

    setImages(reordered);
    onImagesChange(reordered.map((img) => img.storagePath!).filter(Boolean));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-neutral-900">
          Photographs (Max 5)
        </label>
        <span className="text-xs text-neutral-500 font-medium">
          {images.length}/5 uploaded
        </span>
      </div>

      {uploadError && (
        <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-700">
          {uploadError}
        </div>
      )}

      {/* Grid of uploaded images */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {images.map((img, idx) => (
          <div
            key={img.id || idx}
            className="group relative aspect-square rounded-lg border border-neutral-200 bg-neutral-100 overflow-hidden"
          >
            <Image
              src={img.previewUrl}
              alt={`Photo ${idx + 1}`}
              fill
              className="object-cover"
              unoptimized
            />

            {/* Cover photo indicator */}
            {idx === 0 ? (
              <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-sm bg-emerald-700 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                <Star className="h-2.5 w-2.5 fill-current" /> Cover
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setCoverImage(idx)}
                className="absolute top-1.5 left-1.5 rounded-sm bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                title="Make Cover Photo"
              >
                Make Cover
              </button>
            )}

            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute top-1.5 right-1.5 rounded-full bg-red-600 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow-xs"
              title="Remove photo"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Add photo dropzone slot */}
        {images.length < 5 && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50/50 p-4 text-center hover:border-emerald-600 hover:bg-emerald-50/30 transition-colors"
          >
            <Upload className="h-6 w-6 text-neutral-400 mb-1" />
            <span className="text-xs font-semibold text-neutral-700">
              {isUploading ? "Compressing..." : "Add Photo"}
            </span>
            <span className="text-[10px] text-neutral-500 mt-0.5">
              Auto WebP
            </span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        disabled={isUploading || images.length >= 5}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

