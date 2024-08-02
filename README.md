# Readme

## 1. Software Requiements

Istall the following software on your workstation

1. mongodb
2. mongodb database tools
3. yarn
4. node
5. npm
6. git

## 2. Setting Up the Database

1. Make sure MongoDB 4.4 and MongoDB tools are properly installed.
2. Make sure MongoDB server is running. If not, execute `mongod`
3. Download sample DB [here](https://drive.google.com/drive/folders/1qVacEP6RCafjmzL6YLbxC-vU0lhO70jH).
   ✅**NOTE**: If you don't have access, kindly click request access.
4. Extract the file and go to folder
5. run `mongorestore --db jomi --gzip dump`
6. Verify that you have a database db in your local mongodb server

## 3. Local Server setup

1. create `.env` file by copying contents of `.env.example`
2. run `yarn dev`

## 4. (Optional) Email templates

1. Email templates are created using sendgrid dynamic templates. we just need templateId and apikey here in backend.
