interface AvatarProps {
  image?: string;
  size?: number;
}

export default function Avatar({
  image,
  size = 56,
}: AvatarProps) {
  return (
    <img
      src={image ?? "https://i.pravatar.cc/150?img=5"}
      alt="Profile"
      style={{
        width: size,
        height: size,
      }}
      className="rounded-full object-cover border-2 border-green-700"
    />
  );
}