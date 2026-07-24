export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={sizeMap[size]}
    >
      {/* Plato */}
      <ellipse cx="100" cy="110" rx="85" ry="30" fill="#E8D7B8" stroke="#8B7355" strokeWidth="2" />

      {/* Sombra del plato */}
      <ellipse cx="100" cy="115" rx="85" ry="8" fill="#D4C4A8" opacity="0.5" />

      {/* Chilaquiles - triángulo central */}
      <polygon
        points="100,50 50,110 150,110"
        fill="#DC3545"
        stroke="#8B0000"
        strokeWidth="1.5"
      />

      {/* Textura de chilaquiles - líneas */}
      <line x1="75" y1="70" x2="85" y2="100" stroke="#8B0000" strokeWidth="1" opacity="0.6" />
      <line x1="100" y1="55" x2="95" y2="105" stroke="#8B0000" strokeWidth="1" opacity="0.6" />
      <line x1="125" y1="70" x2="115" y2="100" stroke="#8B0000" strokeWidth="1" opacity="0.6" />

      {/* Queso derretido - amarillo */}
      <circle cx="85" cy="85" r="8" fill="#FFD700" opacity="0.8" />
      <circle cx="115" cy="90" r="6" fill="#FFD700" opacity="0.8" />
      <circle cx="100" cy="80" r="7" fill="#FFD700" opacity="0.8" />

      {/* Cebolla - verde */}
      <circle cx="70" cy="95" r="5" fill="#28A745" opacity="0.7" />
      <circle cx="130" cy="100" r="4" fill="#28A745" opacity="0.7" />

      {/* Cilantro - verde oscuro */}
      <path
        d="M 60 75 Q 65 70 70 75"
        stroke="#1D5C3D"
        strokeWidth="1.5"
        fill="none"
        opacity="0.8"
      />
      <path
        d="M 140 75 Q 135 70 130 75"
        stroke="#1D5C3D"
        strokeWidth="1.5"
        fill="none"
        opacity="0.8"
      />

      {/* Brillo/reflejo */}
      <ellipse cx="90" cy="70" rx="15" ry="8" fill="white" opacity="0.3" />

      {/* Texto */}
      <text
        x="100"
        y="155"
        textAnchor="middle"
        fontSize="16"
        fontWeight="bold"
        fill="#DC3545"
        fontFamily="Arial, sans-serif"
      >
        CHILAQUILES
      </text>
      <text
        x="100"
        y="175"
        textAnchor="middle"
        fontSize="12"
        fontWeight="bold"
        fill="#8B7355"
        fontFamily="Arial, sans-serif"
      >
        BAJA
      </text>
    </svg>
  );
}
