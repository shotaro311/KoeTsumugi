const KoeTsumugiLogo = ({
  width,
  height,
  className,
}: {
  width?: number;
  height?: number;
  className?: string;
}) => (
  <img
    src={appIcon}
    width={width}
    height={height}
    className={className}
    alt=""
    aria-hidden="true"
  />
);

export default KoeTsumugiLogo;
import appIcon from "@/assets/app-icon.png";
