.DEFAULT_GOAL := help

.PHONY: help
help: # show help for each recipe
	@grep -E '^[a-zA-Z0-9 -]+:.*#' Makefile | sort | while read -r l; do printf "\033[1;32m$$(echo $$l | cut -f 1 -d':')\033[00m:$$(echo $$l | cut -f 2- -d'#')\n"; done

CHART_NAME := dwmkerr-starter-kit
CHART_PATH := ./chart
NAMESPACE ?= default

# Environment variables for API keys
ANTHROPIC_API_KEY ?= 
GEMINI_API_KEY ?= 
AZURE_OPENAI_API_KEY ?= 
OPENAI_API_KEY ?=
GITHUB_TOKEN ?=

.PHONY: install
install: # install the dwmkerr starter kit models to the cluster using Helm
	@if [ ! -f values.yaml ]; then echo "Error: values.yaml not found. Run 'cp values.template.yaml values.yaml' and configure your API keys."; exit 1; fi
	./scripts/check-env.sh
	# Install everything in one step
	helm upgrade --install $(CHART_NAME) $(CHART_PATH) \
		--values values.yaml \
		--set models.anthropic.apiKey="$(ANTHROPIC_API_KEY)" \
		--set models.gemini.apiKey="$(GEMINI_API_KEY)" \
		--set models.azureOpenAI.apiKey="$(AZURE_OPENAI_API_KEY)" \
		--set models.openai.apiKey="$(OPENAI_API_KEY)" \
		--set mcpServers.github.githubToken="$(GITHUB_TOKEN)" \
		--create-namespace \
		--namespace $(NAMESPACE) \
		--wait

.PHONY: install-all
install-all: install # install all resources including internal tools
	(cd /Users/Dave_Kerr/repos/github/McK-Internal/agents-at-scale-marketplace/services/lexi && make install)
	(cd /Users/Dave_Kerr/repos/github/McK-Internal/agents-at-scale-marketplace/services/noah && make install)
	(cd /Users/Dave_Kerr/repos/github/McK-Internal/agents-at-scale-marketplace/services/ark-agentcore-bridge && make install)
	(cd /Users/Dave_Kerr/repos/github/McK-Internal/agents-at-scale-user && ./aasctl setup && ./aasctl push && ./aasctl up)

.PHONY: uninstall
uninstall: # remove the dwmkerr starter kit from the cluster
	helm uninstall $(CHART_NAME) --namespace $(NAMESPACE) --ignore-not-found

.PHONY: uninstall-all
install-all: uninstall # install all resources including internal tools
	(cd /Users/Dave_Kerr/repos/github/McK-Internal/agents-at-scale-marketplace/services/lexi && make uninstall)
	(cd /Users/Dave_Kerr/repos/github/McK-Internal/agents-at-scale-marketplace/services/noah && make uninstall)
	(cd /Users/Dave_Kerr/repos/github/McK-Internal/agents-at-scale-marketplace/services/ark-agentcore-bridge && make uninstall)
	(cd /Users/Dave_Kerr/repos/github/McK-Internal/agents-at-scale-user && ./aasctl dowm)


.PHONY: status
status: # show deployment status
	helm status $(CHART_NAME) --namespace $(NAMESPACE)
	kubectl get models,secrets -l ark.mckinsey.com/service=dwmkerr-starter-kit -n $(NAMESPACE)

.PHONY: template
template: # render chart templates to see what would be created
	helm template $(CHART_NAME) $(CHART_PATH) \
		--values values.yaml \
		--set models.anthropic.apiKey="$(ANTHROPIC_API_KEY)" \
		--set models.gemini.apiKey="$(GEMINI_API_KEY)" \
		--set models.azureOpenAI.apiKey="$(AZURE_OPENAI_API_KEY)" \
		--set models.openai.apiKey="$(OPENAI_API_KEY)" \
		--set mcpServers.github.githubToken="$(GITHUB_TOKEN)"
