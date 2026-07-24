import Image from 'next/image';

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: { width: 40, height: 40 },
    md: { width: 50, height: 50 },
    lg: { width: 100, height: 100 },
  };

  return (
    <Image
      src="/logo.jpeg"
      alt="Chilaquiles Baja Logo"
      width={sizeMap[size].width}
      height={sizeMap[size].height}
      className="rounded-full shadow-md"
      priority
    />
  );
}
