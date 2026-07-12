# Migrations SaaS v1

Execute o schema completo em banco vazio:

```bash
psql -U ergosense -d ergosense -f ../ergosense-saas-schema-v1.sql
```

Para dividir em migrations incrementais, use a ordem descrita em `ERGOSENSE_DATABASE.md` seção 8.
