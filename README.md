# dwmkerr-ark-demo

A Helm chart for deploying model configurations to Ark for demo purposes.

## Quickstart

```bash
cp values.template.yaml values.yaml
# Edit values.yaml with your API keys
make install
```

Alternatively, set your API keys as environment variables:

```bash
# Set API keys for the providers you want to enable
export ANTHROPIC_API_KEY="your-anthropic-api-key-here"
export GEMINI_API_KEY="your-gemini-api-key-here" 
export AZURE_OPENAI_API_KEY="your-azure-openai-api-key-here"
export OPENAI_API_KEY="your-openai-api-key-here"
```

Then use the following commands to deploy the demo kit:

```bash
# Install the starter kit models on Ark
make install

# Uninstall the starter kit from Ark
make uninstall

# Check deployment status
make status
```

A set of models and demo agents will be created. Check them with:

```bash
kubectl get models
kubectl get agents
```

## Configuration

The chart automatically enables/disables providers based on which API keys you set as environment variables. You can customize the models and base URLs by editing `values.yaml` if needed.

Default configuration includes:

- Anthropic: Claude models with API key from `ANTHROPIC_API_KEY`
- Gemini: Google Gemini models with API key from `GEMINI_API_KEY`
- Azure OpenAI: GPT models with API key from `AZURE_OPENAI_API_KEY`
- OpenAI: GPT models with API key from `OPENAI_API_KEY`

Each provider is automatically enabled only if its corresponding environment variable is set.

## Interactive Notebook

The interactive Jupyter notebook demos ARK's OpenAI-compatible API:

```bash
pip install jupyterlab
python -m jupyterlab notebooks/ark-openai-apis.ipynb
```

The notebook provides an interactive interface to:
- Connect to your ARK deployment
- List all available targets (models, agents, teams, tools)
- Send messages and receive responses
- Toggle between streaming and non-streaming modes
