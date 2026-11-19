#!/usr/bin/env bash
# Cria a infraestrutura do Leva Eu no Azure. Rode no Azure Cloud Shell (bash) ou com `az login`.
# Antes de rodar, mude APP (precisa ser único no mundo) e ALERT_EMAIL.
set -euo pipefail

APP="leva-eu-4espr"                 # vira https://<APP>.azurewebsites.net
RG="rg-leva-eu"
LOCATION="brazilsouth"
PLAN="plan-leva-eu"
SKU="B1"                            # F1 é gratuito, mas não tem "Always On" nem slots; B1 é o mínimo recomendado
INSIGHTS="appi-leva-eu"
ALERT_EMAIL="seu-email@exemplo.com"
REVIEWER_ID=""                      # opcional: objectId do professor para o papel Reader

az extension add --name application-insights --only-show-errors

echo "== Resource Group"
az group create -n "$RG" -l "$LOCATION" -o none

echo "== App Service Plan e Web App (Node 20, Linux)"
az appservice plan create -g "$RG" -n "$PLAN" --is-linux --sku "$SKU" -o none
az webapp create -g "$RG" -p "$PLAN" -n "$APP" --runtime "NODE|20-lts" -o none

echo "== Endurecimento: HTTPS only, TLS 1.2, sem FTP, health check"
az webapp update -g "$RG" -n "$APP" --https-only true -o none
az webapp config set -g "$RG" -n "$APP" --min-tls-version 1.2 --ftps-state Disabled \
   --http20-enabled true --always-on true --generic-configurations '{"healthCheckPath": "/health"}' -o none

echo "== Application Insights (monitoramento)"
az monitor app-insights component create -g "$RG" -a "$INSIGHTS" -l "$LOCATION" --kind web -o none
CONN=$(az monitor app-insights component show -g "$RG" -a "$INSIGHTS" --query connectionString -o tsv)

echo "== Segredos e configuração ficam em App Settings (fora do código)"
az webapp config appsettings set -g "$RG" -n "$APP" -o none --settings \
   NODE_ENV=production \
   APPLICATIONINSIGHTS_CONNECTION_STRING="$CONN"

echo "== Alertas (avisam a equipe antes do cidadão reclamar)"
AG=$(az monitor action-group create -g "$RG" -n ag-leva-eu --short-name levaeu \
      --action email equipe "$ALERT_EMAIL" --query id -o tsv)
APP_ID=$(az webapp show -g "$RG" -n "$APP" --query id -o tsv)
az monitor metrics alert create -g "$RG" -n alerta-erros-5xx --scopes "$APP_ID" \
   --condition "total Http5xx > 5" --window-size 5m --evaluation-frequency 1m \
   --action "$AG" --severity 2 --description "Mais de 5 erros 5xx em 5 minutos" -o none
az monitor metrics alert create -g "$RG" -n alerta-lentidao --scopes "$APP_ID" \
   --condition "avg HttpResponseTime > 2" --window-size 5m --evaluation-frequency 1m \
   --action "$AG" --severity 3 --description "Tempo de resposta médio acima de 2 s" -o none
az monitor metrics alert create -g "$RG" -n alerta-saude --scopes "$APP_ID" \
   --condition "avg HealthCheckStatus < 100" --window-size 5m --evaluation-frequency 1m \
   --action "$AG" --severity 1 --description "Health check /health falhando" -o none

echo "== Acesso por papel (RBAC): quem pode o quê"
# Equipe: Contributor no Resource Group. Avaliador: Reader (só leitura).
if [ -n "$REVIEWER_ID" ]; then
  az role assignment create --assignee "$REVIEWER_ID" --role Reader \
     --scope "$(az group show -n "$RG" --query id -o tsv)" -o none
fi

echo "== Credencial de deploy para o GitHub Actions"
az resource update --namespace Microsoft.Web --resource-type basicPublishingCredentialsPolicies \
   --parent "sites/$APP" --name scm --resource-group "$RG" --set properties.allow=true -o none
echo
echo "Copie o XML abaixo para o secret AZURE_WEBAPP_PUBLISH_PROFILE do GitHub:"
az webapp deployment list-publishing-profiles -g "$RG" -n "$APP" --xml
echo
echo "No GitHub: Settings > Secrets and variables > Actions"
echo "  Secret:   AZURE_WEBAPP_PUBLISH_PROFILE  (o XML acima)"
echo "  Variable: AZURE_WEBAPP_NAME = $APP"
echo "URL: https://$APP.azurewebsites.net"
