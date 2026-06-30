# Azure naming validation: workforceplanning rename probe

Checks locally:
- length/case rules for App Service, Storage account, and resource group
- pattern constraints
- duplicates within-scope where name list is known

Limits without cloud auth:
- Cannot check global uniqueness against Azure
- Cannot check subscription-level resource-group uniqueness
