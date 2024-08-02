import { CounterAttribute } from "../entities/Access/CounterAttribute";
import { CounterFilter } from "../entities/Access/CounterFilter";
import { CounterInput } from "../entities/Access/CounterInput";

//Function which generates a default range of dates for COUNTER report generation
const defaultReportingPeriod = () => {
  let reporting_period_start = new Date();
  reporting_period_start.setDate(1);
  reporting_period_start.setMonth(6);
  reporting_period_start.setFullYear(2014);
  let reporting_period_end = new Date();
  reporting_period_end.setDate(1);
  return [reporting_period_start, reporting_period_end]
}
let defRepPeriod = defaultReportingPeriod();

const reportingPeriodToString = (rep_period: Date[]) => {
  const myReportingPeriod = rep_period;
  const myStartMonth = myReportingPeriod[0].getMonth() <= 10 ? `0${myReportingPeriod[0].getMonth() + 1}` : myReportingPeriod[0].getMonth() + 1;
  const myStartDate = myReportingPeriod[0].getDate() <= 10 ? `0${myReportingPeriod[0].getDate()}` : myReportingPeriod[0].getDate();
  const myEndMonth = myReportingPeriod[1].getMonth() <= 10 ? `0${myReportingPeriod[1].getMonth() + 1}` : myReportingPeriod[1].getMonth() + 1;
  const myEndDate = myReportingPeriod[1].getDate() <= 10 ? `0${myReportingPeriod[1].getDate()}` : myReportingPeriod[1].getDate();
  return `Begin_Date=${myReportingPeriod[0].getFullYear()}-${myStartMonth}-${myStartDate}; End_Date=${myReportingPeriod[1].getFullYear()}-${myEndMonth}-${myEndDate}`;
}

//Switch statement that returns the name of the report based off the ID from CounterInput
const findReportName = (report_id: String) => {
  switch(report_id) {
    case "PR":
      return "Platform Master Report";
    case "PR_P1":
      return "Platform Usage";
    case "DR":
      return "Database Master Report";
    case "DR_D1":
      return "Database Search and Item Usage";
    case "DR_D2":
      return "Database Access Denied";
    case "TR":
      return "Title Master Report";
    case "TR_J1":
      return "Journal Requests (Excluding OA_Gold)";
    case "TR_J4":
      return "Journal Requests by YOP (Excluding OA_Gold)";
    case "IR":
      return "Item Master Report";
    case "IR_A1":
      return "Journal Article Requests";
    case "IR_M1":
      return "Multimedia Item Requests";
    default:
      return null;
  }
}

//function that finds default case for metric_types based on the inputted report_id
const findMetricTypesHeader = (report_id: string) => {
  switch(report_id){
    case "PR":
      const metric_types_pr = ["Searches_Platform", "Total_Item_Investigations", "Total_Item_Requests",
        "Unique_Item_Investigations", "Unique_Item_Requests"];
      const metric_types_pr_str = metric_types_pr.toString();
      const metric_types_pr_final = metric_types_pr_str.replace(/,/g, "; ");
      return metric_types_pr_final;
    case "PR_P1":
      const metric_types_prsv = ["Searches_Platform", "Total_Item_Requests", "Unique_Item_Requests"];
      const metric_types_prsv_str = metric_types_prsv.toString();
      const metric_types_prsv_final = metric_types_prsv_str.replace(/,/g, "; ");
      return metric_types_prsv_final;
    case "DR":
      const metric_types_dr = [ "Searches_Regular", "Total_Item_Investigations"
        , "Total_Item_Requests", "Unique_Item_Investigations", "Unique_Item_Requests"];
      const metric_types_dr_str = metric_types_dr.toString();
      const metric_types_dr_final = metric_types_dr_str.replace(/,/g, "; ");
      return metric_types_dr_final;
    case "DR_D1":
      const metric_types_drd1 = ["Searches_Regular", "Total_Item_Investigations",
        "Total_Item_Requests"];
      const metric_types_drd1_str = metric_types_drd1.toString();
      const metric_types_drd1_final = metric_types_drd1_str.replace(/,/g, "; ");
      return metric_types_drd1_final;
    case "DR_D2":
      return "No_License; "
    case "TR": 
      const metric_types_tr = ["Total_Item_Investigations", "Unique_Item_Investigations",
        "Total_Item_Requests", "Unique_Item_Requests"];
      const metric_types_tr_str = metric_types_tr.toString();
      const metric_types_tr_final = metric_types_tr_str.replace(/,/g, "; ");
      return metric_types_tr_final;
    case "TR_J1":
      const metric_types_trj1 = ["Total_Item_Requests", "Unique_Item_Requests"];
      const metric_types_trj1_str = metric_types_trj1.toString();
      const metric_types_trj1_final = metric_types_trj1_str.replace(/,/g, "; ");
      return metric_types_trj1_final;
    case "TR_J4":
      const metric_types_trj4 = ["Total_Item_Requests", "Unique_Item_Requests"];
      const metric_types_trj4_str = metric_types_trj4.toString();
      const metric_types_trj4_final = metric_types_trj4_str.replace(/,/g, "; ");
      return metric_types_trj4_final;
    case "IR":
      const metric_types_ir = ["Total_Item_Investigations", "Total_Item_Requests", "Unique_Item_Investigations"
        , "Unique_Item_Requests", "No_License"];
      const metric_types_ir_str = metric_types_ir.toString();
      const metric_types_ir_final = metric_types_ir_str.replace(/,/g, "; ");
      return metric_types_ir_final;
    case "IR_A1":
      const metric_types_ira1 = ["Total_Item_Requests", "Unique_Item_Requests"];
      const metric_types_ira1_str = metric_types_ira1.toString();
      const metric_types_ira1_final = metric_types_ira1_str.replace(/,/g, "; ");
      return metric_types_ira1_final;
    case "IR_M1":
      const metric_types_irm1 = ["Total_Item_Requests"];
      const metric_types_irm1_str = metric_types_irm1.toString();
      const metric_types_irm1_final = metric_types_irm1_str.replace(/,/g, "; ");
      return metric_types_irm1_final;
    default:
      return null;
  }
}

//Function used to format the Reported Filters given a user input per Counter guidelines
const formatInputtedFilters = (filters : CounterFilter[], report_id: string) => {
  switch(report_id) {
    case "PR_P1":
      return "Access_Method=Regular";
    default:
      break;
  }
  type filter_options = {
    [key: string]: string[],
  };
  let emptyObj: filter_options = {};
  //Reduce filters into an object which has all entries in the right spot for toString()
  const reducedFilters = filters.reduce((acc, cFilter) => {
    const key= cFilter["filterName"];
    acc[key] ??= [];
    acc[key].push(cFilter.value);

    return acc;
  }, emptyObj);
    
  const entries = Object.entries(reducedFilters);
  const formattedEntries = entries.toString().replace(/,/g,"; ");
    
  let finalizedStr = "";
  for(let i = 0; i<entries.length; i++) {
    i === 0 ? finalizedStr = formattedEntries.replace(`${entries[i][0]};`, `${entries[i][0]}=`) : finalizedStr = finalizedStr.replace(`${entries[i][0]};`, `${entries[i][0]}=`);
    for(let k = 0; k<entries[i][1].length; k++) {
      k < entries[i][1].length - 1 ? finalizedStr = finalizedStr.replace(`${entries[i][1][k]};`, `${entries[i][1][k]} |`) : finalizedStr = finalizedStr.replace(`${entries[i][1][k]};`, `${entries[i][1][k]};`);
    }
  }
  finalizedStr = finalizedStr.concat(";");
  return finalizedStr;
}

//function that returns the default COUNTER report_filters based on the inputted report_id
//see https://www.projectcounter.org/code-of-practice-five-sections/4-1-usage-reports/ for reference
const findReportFilters = (report_id: string) => {
  let data_types: string, access_methods: string, access_types: string, database: string;
  switch(report_id) {
    case "PR":
      data_types = "Data_Type=Platform | Journal | Article | Database | Multimedia; ";
      access_methods = "Access_Method=Regular; ";
      return data_types.concat(access_methods);
    case "PR_P1":
      return access_methods = "Access_Method=Regular; ";
    case "DR":
      data_types = "Data_Type=Journal | Multimedia | Database; ";
      access_methods = "Access_Method=Regular; ";
      database = "";
      return data_types.concat(access_methods).concat(database);
    case "DR_D1":
      return access_methods = "Access_Method=Regular; ";
    case "DR_D2":
      return access_methods = "Access_Method=Regular; ";
    case "TR":
      data_types = "Data_Type=Journal; ";
      access_methods = "Access_Method=Regular; "
      return data_types.concat(access_methods);
    case "TR_J1":
    case "TR_J4":
      data_types = "Data_Type=Journal; ";
      access_types="Access_Type=Controlled; ";
      access_methods="Access_Method=Regular; ";
      return data_types.concat(access_types).concat(access_methods);
    case "IR":
      data_types = "Data_Type=Article | Multimedia; ";
      access_methods = "Access_Method=Regular; ";
      return data_types.concat(access_methods);
    case "IR_A1":
      data_types = "Data_Type=Article; Parent_Data_Type=Journal; ";
      access_methods = "Access_Method=Regular; ";
      return data_types.concat(access_methods);
    case "IR_M1":
      data_types = "Data_Type=Multimedia; ";
      access_methods = "Access_Method=Regular; ";
      return data_types.concat(access_methods);
    default: 
      return null;
  }
}

const formatInputtedAttributes = (attributes: CounterAttribute[]) => {
  type filter_options = {
    [key: string]: string[],
  };
  let emptyObj: filter_options = {};
  //Reduce filters into an object which has all entries in the right spot for toString()
  const reducedFilters = attributes.reduce((acc, cFilter) => {
    const key= cFilter["attributeName"];
    acc[key] ??= [];
    acc[key].push(cFilter.value);
  
    return acc;
  }, emptyObj);
        
  const entries = Object.entries(reducedFilters);
  const formattedEntries = entries.toString().replace(/,/g,"; ");
        
  let finalizedStr = "";
  for(let i = 0; i<entries.length; i++) {
    i === 0 ? finalizedStr = formattedEntries.replace(`${entries[i][0]};`, `${entries[i][0]}=`) : finalizedStr = finalizedStr.replace(`${entries[i][0]};`, `${entries[i][0]}=`);
    for(let k = 0; k<entries[i][1].length; k++) {
      k < entries[i][1].length - 1 ? finalizedStr = finalizedStr.replace(`${entries[i][1][k]};`, `${entries[i][1][k]} |`) : finalizedStr = finalizedStr.replace(`${entries[i][1][k]};`, `${entries[i][1][k]};`);
    }
  }
  finalizedStr = finalizedStr.concat(";");
  return finalizedStr;
}

const findReportedAttributes = (report_id: string) => {
  switch(report_id) {
    case "PR":
    case "DR":
    case "TR":
    case "IR":
      return "Attributes_To_Show=Data_Type | Access_Method;"
    case "PR_P1":
    case "DR_D1":
    case "DR_D2":
    case "TR_J1":
    case "TR_J4":
    case "IR_A1":
    case "IR_M1":
      return "";
    default: 
      return null;
  }
}

//Generate all the headers required for a COUNTER report
export const generateHeaders = async(input: CounterInput, institution_name: String, institution_id: String) => {
  const report_id = input.report_id;
  const report_name = findReportName(input.report_id);
  const release_num = 5; //COUNTER release version 5 (as of 8/23/22)
  const metric_types = findMetricTypesHeader(report_id);
  const created = new Date().toISOString().split('.')[0]+"Z";

  let reporting_period;
  if(input.reporting_period_end && input.reporting_period_start){
    reporting_period = reportingPeriodToString([input.reporting_period_start, input.reporting_period_end])
  } else {
    reporting_period = reportingPeriodToString(defRepPeriod);
  }
  
  let report_filters;
  if(input.report_filters) {
    report_filters = formatInputtedFilters(input.report_filters, report_id);
  } else {
    report_filters = findReportFilters(report_id)
  }
  
  let report_attributes;
  if(input.report_attributes){
    report_attributes = formatInputtedAttributes(input.report_attributes);
  } else {
    report_attributes = findReportedAttributes(report_id);
  }

  const created_by = institution_name;
  /* We have all the headers so now we need to format the data into TSV
      Example: "Column 1 Row A,Column 2 Row A\nColumn 1 Row B,Column 2 Row B"
      Output: Column 1 Row A Column 2 Row A
              Column 1 Row B Column 2 Row B
  */
  const headerCSVFormat = `Report_Name,${report_name}\nReport_ID,${report_id}\nRelease,${release_num}\nInstitution_Name,${institution_name}\nInstitution_ID,jomiID:${institution_id}\nMetric_Types,${metric_types}\nReport_Filters,${report_filters}\nReport_Attributes,${report_attributes}\nExceptions,\nReporting_Period,${reporting_period}\nCreated,${created}\nCreated_By,${created_by}\n,\n`;
  return headerCSVFormat
}