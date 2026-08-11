import React from "react";

export type IconName =
  | "reportes"
  | "canales"
  | "flujo"
  | "conectar"
  | "integracion"
  | "exportar"
  | "importar"
  | "filtro"
  | "rango"
  | "programado"
  | "buscar"
  | "ajustes"
  | "usuario"
  | "equipo"
  | "plantilla"
  | "verificado"
  | "alerta"
  | "subida"
  | "bajada"
  | "mas";

export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  name: IconName;
  size?: number | string;
}

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ name, size = 24, className = "", ...props }, ref) => {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        className={`fc-icon ${className}`}
        {...props}
      >
        <use href={`#fc-${name}`} />
      </svg>
    );
  }
);
Icon.displayName = "Icon";
