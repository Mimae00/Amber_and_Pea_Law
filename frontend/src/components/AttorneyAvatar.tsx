interface AttorneyAvatarProps {
  name: string;
  photoUrl?: string;
  size?: number;
}

/**
 * Attorney photo (lazy-loaded) or an initials placeholder when no photo is set.
 */
export function AttorneyAvatar({ name, photoUrl, size = 96 }: AttorneyAvatarProps) {
  if (photoUrl) {
    return (
      <img
        className="avatar"
        src={photoUrl}
        alt={`Portrait of ${name}`}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span className="avatar avatar--initials" style={{ width: size, height: size, fontSize: size / 2.6 }} aria-hidden="true">
      {initials}
    </span>
  );
}
