import appIcon from "@/assets/app-icon.png";

const KoeTsumugiMark = ({
  width,
  height,
}: {
  width?: number | string;
  height?: number | string;
}) => (
  <img
    src={appIcon}
    width={width || 64}
    height={height || 64}
    alt=""
    aria-hidden="true"
  />
);

export default KoeTsumugiMark;
