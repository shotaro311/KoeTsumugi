# Home-manager module for KoeTsumugi speech-to-text
#
# Provides a systemd user service for autostart.
# Usage: imports = [ koetsumugi.homeManagerModules.default ];
#        services.koetsumugi.enable = true;
{
  config,
  lib,
  pkgs,
  ...
}:
let
  cfg = config.services.koetsumugi;
in
{
  options.services.koetsumugi = {
    enable = lib.mkEnableOption "KoeTsumugi speech-to-text user service";

    package = lib.mkOption {
      type = lib.types.package;
      defaultText = lib.literalExpression "koetsumugi.packages.\${system}.koetsumugi";
      description = "The KoeTsumugi package to use.";
    };
  };

  config = lib.mkIf cfg.enable {
    systemd.user.services.koetsumugi = {
      Unit = {
        Description = "KoeTsumugi speech-to-text";
        After = [ "graphical-session.target" ];
        PartOf = [ "graphical-session.target" ];
      };
      Service = {
        ExecStart = "${cfg.package}/bin/koetsumugi";
        Restart = "on-failure";
        RestartSec = 5;
      };
      Install.WantedBy = [ "graphical-session.target" ];
    };
  };
}
