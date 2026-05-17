SUBSCRIPTION_ID="2dbeb3f1-e45d-4207-a7e9-185330aad74b"
RESOURCE_GROUP="rgWorkforcePlan"
APP_NAME="alicante"
STORAGE_ACCOUNT="saworkforceplan"

az account set --subscription "$SUBSCRIPTION_ID"

APP_PRINCIPAL_ID=$(az webapp identity assign \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --query principalId \
  --output tsv)

STORAGE_SCOPE=$(az storage account show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$STORAGE_ACCOUNT" \
  --query id \
  --output tsv)

az role assignment create \
  --assignee-object-id "$APP_PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Table Data Contributor" \
  --scope "$STORAGE_SCOPE"

az webapp config appsettings set \
  --resource-group "$RESOURCE_GROUP" \
  --name "$APP_NAME" \
  --settings AZURE_STORAGE_ACCOUNT_NAME="$STORAGE_ACCOUNT"
