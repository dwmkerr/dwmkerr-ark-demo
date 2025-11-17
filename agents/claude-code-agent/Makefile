.DEFAULT_GOAL := help

.PHONY: help
help: # show help for each of the Makefile recipes
	@grep -E '^[a-zA-Z0-9 -]+:.*#'  Makefile | sort | while read -r l; do printf "\033[1;32m$$(echo $$l | cut -f 1 -d':')\033[00m:$$(echo $$l | cut -f 2- -d'#')\n"; done

.PHONY: init
init: # install dependencies
	npm install

.PHONY: dev
dev: init # run in development mode with live reload
	npm run dev

.PHONY: build
build: # build container image
	docker build -t claude-agent:latest .

.PHONY: install
install: # deploy to kubernetes with devspace
	devspace deploy

.PHONY: uninstall
uninstall: # remove from kubernetes
	devspace purge

.PHONY: lint
lint: # run linting and type checking
	npm run lint

.PHONY: lint-fix
lint-fix: # fix linting issues
	npm run lint:fix

.PHONY: a2a-inspector
a2a-inspector: # run A2A inspector and open browser
	@(sleep 5 && (open http://127.0.0.1:5001 || xdg-open http://127.0.0.1:5001 || echo "Please open http://127.0.0.1:5001 in your browser")) &
	cd ~/repos/github/a2aproject/a2a-inspector/ && ./scripts/run.sh
