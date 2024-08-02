import fs from "fs";
import path from "path";
import { generateBody } from "../counter/genCounterBody";
import { generateHeaders } from "../counter/genCounterHeaders";
import { InstitutionModel } from "../entities";
import { CounterInput } from "../entities/Access/CounterInput";
import { logger } from "../logger";

const FOLDER_DOI = "./counterreports";
const FULL_DOI_DIR = path.join(__dirname, FOLDER_DOI);

//Create a CSV file for a COUNTER report
export const generateSingleCSV = async (csvData: string) => {
  try {
    //Check if the path doesn't exist, create it if so
    if (!fs.existsSync(FULL_DOI_DIR)) {
      fs.mkdir(`${FULL_DOI_DIR}`, (err: any) => {
        if (err) throw err;
      });
    }
  
    //If the TSV file doesn't already exist, make a new one and put it in the counterreport folder
    if (!fs.existsSync(path.join(FULL_DOI_DIR, `creport.csv`))) {
      fs.writeFileSync(path.join(FULL_DOI_DIR, `creport.csv`), csvData);
      logger.info(`----- COUNTER CSV BUILT -----`);
    } else {
      logger.error("CSV File already exists");
    }
  } catch (err) {
    throw err;
  }
};

export const generateCounterReport = async(input: CounterInput) => {
  try {
    let userInstitution;
    
    userInstitution = await InstitutionModel.findOne({_id: input.institution_id})
    
    if(userInstitution) {
      const institution_name = userInstitution.name;
      const institution_id = userInstitution._id;
      const myHeader = await generateHeaders(input, institution_name, institution_id);
      const myBody = await generateBody(input, institution_name);
      return myHeader.concat(myBody)
    } else {
      return "Error when generating Counter Report"
    }
  } catch(e) {
    logger.error("Error finding Institution when generating Counter Report: " + e)
    return "Error when generating Counter Report"
  }
}