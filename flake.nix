{
  description = "Relic Works site (Next.js + TypeScript)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});

      # Each app runs in the current directory, which must be the project root.
      # It installs the npm packages from package-lock.json when node_modules is missing.
      mkApp = pkgs: name: script: {
        type = "app";
        program = "${pkgs.writeShellApplication {
          inherit name;
          runtimeInputs = [ pkgs.nodejs_22 ];
          text = ''
            if [ ! -f package.json ]; then
              echo "Run this command from the project root." >&2
              exit 1
            fi
            if [ ! -d node_modules ]; then
              npm ci
            fi
            ${script}
          '';
        }}/bin/${name}";
      };
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell ({
          packages = [ pkgs.nodejs_22 ];
        } // pkgs.lib.optionalAttrs pkgs.stdenv.hostPlatform.isLinux {
          # Browsers that npx playwright install downloads do not run on NixOS, so use the
          # nixpkgs browsers. Keep @playwright/test in package.json at playwright-driver.version.
          PLAYWRIGHT_BROWSERS_PATH = pkgs.playwright-driver.browsers;
          PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
        });
      });

      apps = forAllSystems (pkgs: rec {
        # Development server with reload on file change.
        dev = mkApp pkgs "relic-dev" ''exec npm run dev -- "$@"'';
        # Production build, then the production server.
        serve = mkApp pkgs "relic-serve" ''
          npm run build
          exec npm start -- "$@"
        '';
        default = dev;
      });
    };
}
