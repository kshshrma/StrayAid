interface ImagePreviewProps {
  image: File | null;
}

export default function ImagePreview({
  image,
}: ImagePreviewProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow">

      <h2 className="mb-4 text-xl font-semibold">
        Image Preview
      </h2>

      <div className="flex h-64 items-center justify-center overflow-hidden rounded-xl border">

        {image ? (
          <img
            src={URL.createObjectURL(image)}
            alt="Preview"
            className="h-full w-full object-cover"
          />
        ) : (
          <p className="text-slate-500">
            No image selected
          </p>
        )}

      </div>

    </div>
  );
}