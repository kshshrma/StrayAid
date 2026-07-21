interface ImageUploaderProps {
  image: File | null;
  setImage: React.Dispatch<React.SetStateAction<File | null>>;
}

export default function ImageUploader({
  setImage,
}: ImageUploaderProps) {
  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    if (!event.target.files?.length) return;

    setImage(event.target.files[0]);
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow">

      <h2 className="mb-4 text-xl font-semibold">
        Upload Image
      </h2>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageChange}
        className="block w-full"
      />

    </div>
  );
}