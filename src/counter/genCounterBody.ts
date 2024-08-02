import { AccessModel, ArticleModel } from "../entities";
import { ActivityEnum } from "../entities/Access/ActivityType";
import { CounterInput } from "../entities/Access/CounterInput";
import { Article } from "../entities/Article/Article";
import { logger } from "../logger";


//Function which generates a default range of dates for COUNTER report generation
const defaultReportingPeriod = () => {
  let reporting_period_start = new Date();
  reporting_period_start.setDate(1);
  reporting_period_start.setMonth(7);
  reporting_period_start.setFullYear(2014);
  let reporting_period_end = new Date();
  reporting_period_end.setDate(1);
  return [reporting_period_start, reporting_period_end]
}
let defRepPeriod = defaultReportingPeriod();

//function used for determining which data types we need when generating the body of the report
const findDataTypesBody = (report_id: string) => {
  switch(report_id){
    case "PR":
      return ["Journal", "Article", "Multimedia", "Database"];
    case "DR":
      return ["Journal", "Multimedia", "Database"];
    case "TR":
      return ["Journal", "Multimedia"];
    case "IR":
      return ["Article", "Multimedia"];
    case "IR_A1":
    case "IR_M1":
    case "TR_J1":
    case "TR_J4":
    case "PR_P1":
    case "DR_D1":
    case "DR_D2":
      return [""];
    default:
      return [];
  }
}

const findAccessTypesBody = (report_id: string) => {
  switch(report_id){
    case "PR":
    case "DR":
    case "TR":
    case "IR":
    case "PR_P1":
    case "DR_D1":
    case "DR_D2":
    case "TR_J1":
    case "TR_J4":
      return "";
    case "IR_A1":
    case "IR_M1":
      return "Controlled";
    default:
      return null;
  }
}

//Function that returns the value for the Access Method column in the body of a COUNTER report
//Standard View reports do not need to display this so we return an empty string.
const findAccessMethodBody = (report_id: string) => {
  switch(report_id){
    case "PR":
    case "DR":
    case "TR":
    case "IR":
      return "Regular";
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

//Function used to return an array of strings that corresponds to the Metric Type column
// in the body of a COUNTER report.
const findMetricTypesBody = (report_id: string) => {
  switch(report_id){
    case "PR":
      return ["Total_Item_Investigations","Total_Item_Requests",
        "Unique_Item_Investigations", "Unique_Item_Requests", "Searches_Platform"];
    case "PR_P1":
      return ["Total_Item_Requests", "Unique_Item_Requests", "Searches_Platform"];
    case "DR":
      return ["Total_Item_Investigations", "Total_Item_Requests", "Unique_Item_Investigations"
        , "Unique_Item_Requests", "Searches_Regular"];
    case "DR_D1":
      return ["Total_Item_Investigations", "Total_Item_Requests", "Searches_Regular"];
    case "DR_D2":
      return ["No_License"];
    case "TR":
      return ["Total_Item_Investigations", "Unique_Item_Investigations", "Total_Item_Requests", 
        "Unique_Item_Requests"];
    case "TR_J1":
    case "TR_J4":
      return ["Total_Item_Requests", "Unique_Item_Requests"];
    case "IR":
      return ["Total_Item_Investigations","Total_Item_Requests",
      "Unique_Item_Investigations", "Unique_Item_Requests", "No_License"];
    case "IR_A1":
      return ["Total_Item_Requests", "Unique_Item_Requests"];
    case "IR_M1":
      return ["Total_Item_Requests"];
    default:
      return [""];
  }
}

//Get the total item investigations for a report based on the data type, institution, and if an item (article) is being checked
const getTotalItemRequests = async(data_type: string, reporting_period_start: Date, reporting_period_end:Date, institutionName: string, article: Article | null) => {
  let query: any;
  try {
    switch(data_type){
      //"" is the case for reports that don't have data types such as PR_P1
      case "":
      case "Journal":
        article ? query = {$and: [{institution_name: institutionName}, {activity: {$in: [ActivityEnum.Article, ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}, {article_title: article.title}]}
          : query = {$and: [{institution_name: institutionName}, {activity: {$in: [ActivityEnum.Article, ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}]};
        return await AccessModel.countDocuments(query);
      case "Article":
        article ? query = {$and: [{institution_name: institutionName}, {activity: {$in: [ActivityEnum.Article]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}, {article_title:article.title}]}
          : query = {$and: [{institution_name: institutionName}, {activity: {$in: [ActivityEnum.Article]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}]};
        return await AccessModel.countDocuments(query);
      case "Multimedia":
        article ? query = {$and: [{institution_name: institutionName}, {activity: {$in: [ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}]}
          : query = {$and: [{institution_name: institutionName}, {activity: {$in: [ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}]};
        return await AccessModel.countDocuments(query);
      default:
        return -1;
    }
  } catch (e) {
    logger.error("Error when querying for Total Item Requests for Counter reports: " + e);
    return null;
  }
}

//Get the total item requests for a report based on the report_id
const getTotalItemInvestigations = async(data_type: string, reporting_period_start: Date, reporting_period_end:Date, institutionName:string, article: Article | null) => {
  let query: any;
  try {
    switch(data_type) {
      case "":
      case "Journal":
        article ? query = {$and: [{institution_name: institutionName}, {activity: {$in: [ActivityEnum.Article, ActivityEnum.VideoBlock, ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}, {article_title:article.title}]}
          : query = {$and: [{institution_name: institutionName}, {activity: {$in: [ActivityEnum.Article, ActivityEnum.VideoBlock, ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}]};
        return await AccessModel.countDocuments(query);
      case "Article":
        article ? query = {$and: [{institution_name: institutionName}, {activity: {$in: [ActivityEnum.Article]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}, {article_title: article.title}]}
          : query = {$and: [{institution_name: institutionName}, {activity: {$in: [ActivityEnum.Article]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}]};
        return await AccessModel.countDocuments(query);
      case "Multimedia":
        article ? query = {$and: [{institution_name: institutionName}, {activity: {$in: [ActivityEnum.VideoBlock, ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}, {article_title:article.title}]}
          : query = {$and: [{institution_name: institutionName}, {activity: {$in: [ActivityEnum.VideoBlock, ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}]};
        return await AccessModel.countDocuments(query);
      default:
        return -1;
    }
  } catch(e) {
    logger.error("Error when querying for Total Item Investigations for Counter reports: " + e);
    return null;
  }
}

//Get the total unique item investigations for a report based on the report_id
const getUniqueItemInvestigations = async(data_type: string, reporting_period_start: Date, reporting_period_end:Date, institutionName:string, article: Article | null) => {
  let query: any;
  try {
    switch(data_type) {
      case "":
      case "Journal":
        article ? query = {$and: [{institution_name: institutionName}, {uniqueView: true}, {activity: {$in: [ActivityEnum.Article, ActivityEnum.VideoBlock, ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}, {article_title:article.title}]}
          : query = {$and: [{institution_name: institutionName}, {uniqueView: true}, {activity: {$in: [ActivityEnum.Article, ActivityEnum.VideoBlock, ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}]};
        return await AccessModel.countDocuments(query);
      case "Article":
        article ? query = {$and: [{institution_name: institutionName}, {uniqueView: true}, {activity: {$in: [ActivityEnum.Article]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}, {article_title:article.title}]}
          : query = {$and: [{institution_name: institutionName}, {uniqueView: true}, {activity: {$in: [ActivityEnum.Article]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}]};
        return await AccessModel.countDocuments(query);
      case "Multimedia":
        article ? query = {$and: [{institution_name: institutionName}, {uniqueView: true}, {activity: {$in: [ActivityEnum.VideoBlock, ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}, {article_title:article.title}]}
          : query = {$and: [{institution_name: institutionName}, {uniqueView: true}, {activity: {$in: [ActivityEnum.VideoBlock, ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}]};
        return await AccessModel.countDocuments(query);
      default:
        return -1;
    }
  } catch (e){
    logger.error("Error when querying for Unique Item Investigations for Counter reports: " + e);
    return null;
  }
}

//Get the total unique item requests for a report based on the report_id
const getUniqueItemRequests = async(report_id: string, reporting_period_start: Date, reporting_period_end:Date, institutionName:string, article: Article | null) => {
  let query: any;
  try {
    switch(report_id) {
      case "":
      case "Journal":
        article ? query = {$and: [{institution_name: institutionName}, {uniqueView: true}, {activity: {$in: [ActivityEnum.Article, ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}, {article_title:article.title}]}
          : query = {$and: [{institution_name: institutionName}, {uniqueView: true}, {activity: {$in: [ActivityEnum.Article, ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}]};
        return await AccessModel.countDocuments(query);
      case "Article":
        article ? query = {$and: [{institution_name: institutionName}, {uniqueView: true}, {activity: {$in: [ActivityEnum.Article]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}, {article_title:article.title}]}
          : query = {$and: [{institution_name: institutionName}, {uniqueView: true}, {activity: {$in: [ActivityEnum.Article]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}]};
        return await AccessModel.countDocuments(query);
      case "Multimedia":
        article ? query = {$and: [{institution_name: institutionName}, {uniqueView: true}, {activity: {$in: [ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}, {article_title:article.title}]}
          : query = {$and: [{institution_name: institutionName}, {uniqueView: true}, {activity: {$in: [ActivityEnum.VideoPlay]}}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}]};
        return await AccessModel.countDocuments(query);
      default:
        return -1;
    }
  } catch (e) {
    logger.error("Error when querying for Unique Item Requests for Counter reports: " + e);
    return null;
  }
}

//Get the total number of searches on the platform
const getSearchesPlatform = async (data_type: string, reporting_period_start: Date, reporting_period_end:Date, institutionName:string, article: Article | null) => {
  let query: any;
  try {
    switch(data_type){
      //Blank case is for Standard view reports since they cannot have data_types shown in the body
      case "":
      case "Database":
        article ? query = {$and: [{institution_name: institutionName}, {activity: ActivityEnum.Search}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}, {article_title:article.title}]}
          : query = {$and: [{institution_name: institutionName}, {activity: ActivityEnum.Search}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}]};
        return await AccessModel.countDocuments(query);
      default:
        return -1;
    }
  } catch (e) {
    logger.error("Error when querying for Searches Platform for Counter reports: " + e);
    return null;
  }
}

//Get the total number of searches on the platform
const getNoLicense = async (data_type: string, reporting_period_start: Date, reporting_period_end:Date, institutionName:string, article: Article | null) => {
  let query: any;
  try {
    switch(data_type){
      //Blank case is for Standard view reports since they cannot have data_types shown in the body
      case "":
      case "Multimedia":
      case "Database":
        article ? query = {$and: [{institution_name: institutionName}, {activity: ActivityEnum.VideoBlock}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}, {article_title: article.title}]}
          : query = {$and: [{institution_name: institutionName}, {activity: ActivityEnum.VideoBlock}, {created:{$gte:reporting_period_start,$lt:reporting_period_end}}]}
        return await AccessModel.countDocuments(query);
      default:
        return -1;
    }
  } catch (e) {
    logger.error("Error when querying for No License for Counter reports: " + e);
    return null;
  }
  
}

//function used to collect the usage stats given a counter report id, 
// reporting period, and the metric types required
const findUsageStatsOverall = async(data_types: string[], reporting_period_start: Date, reporting_period_end: Date, metric_types: any[], institutionName: string, articles: Article[] | null) => {
  let data, usageStats;
  if(articles){
    usageStats = await Promise.all(articles.map(async (article) => {
      return await Promise.all(data_types.map(async (d_type) => {
        return await Promise.all(metric_types.map(async (metric) => {
          switch (metric){
            case "Total_Item_Investigations":
              if(d_type === "Database") {
                return -1;
              } else {
                !reporting_period_start ? data = await getTotalItemInvestigations(d_type, defRepPeriod[0], defRepPeriod[1], institutionName, article) :
                  data = await getTotalItemInvestigations(d_type, reporting_period_start, reporting_period_end, institutionName, article);
                  
                return data;
              }
            case "Total_Item_Requests":
              if(d_type === "Database") {
                return -1;
              } else {
                !reporting_period_start ? data = await getTotalItemRequests(d_type, defRepPeriod[0], defRepPeriod[1], institutionName, article) :
                  data = await getTotalItemRequests(d_type, reporting_period_start, reporting_period_end, institutionName, article);
                  
                return data;
              }
            case "Unique_Item_Investigations":
              if(d_type === "Database") {
                return -1;
              } else {
                !reporting_period_start ? data = await getUniqueItemInvestigations(d_type, defRepPeriod[0], defRepPeriod[1], institutionName, article) :
                  data = await getUniqueItemInvestigations(d_type, reporting_period_start, reporting_period_end, institutionName, article);
                  
                return data;
              }
            case "Unique_Item_Requests":
              if(d_type === "Database") {
                return -1;
              } else {
                !reporting_period_start ? data = await getUniqueItemRequests(d_type, defRepPeriod[0], defRepPeriod[1], institutionName, article) :
                  data = await getUniqueItemRequests(d_type, reporting_period_start, reporting_period_end, institutionName, article);
                  
                return data;
              }
            case "Searches_Platform":
            case "Searches_Regular":
              if(d_type !== "Database" && d_type !== "") {
                return -1;
              } else {
                !reporting_period_start ? data = await getSearchesPlatform(d_type, defRepPeriod[0], defRepPeriod[1], institutionName, article) :
                  data = await getSearchesPlatform(d_type, reporting_period_start, reporting_period_end, institutionName, article);
                  
                return data;
              }
            case "No_License":
              if(d_type != "Multimedia") {
                return -1;
              } else {
                !reporting_period_start ? data = await getNoLicense(d_type, defRepPeriod[0], defRepPeriod[1], institutionName, article) :
                  data = await getNoLicense(d_type, reporting_period_start, reporting_period_end, institutionName, article);
                  
                return data;
              }
            default:
              return -1;
          }
        }));
      }));
    }));
  } else {
    usageStats = await Promise.all(data_types.map(async (d_type) => {
      return await Promise.all(metric_types.map(async (metric) => {
        switch (metric){
          case "Total_Item_Investigations":
            if(d_type === "Database") {
              return -1;
            } else {
              !reporting_period_start ? data = await getTotalItemInvestigations(d_type, defRepPeriod[0], defRepPeriod[1], institutionName, null) :
                data = await getTotalItemInvestigations(d_type, reporting_period_start, reporting_period_end, institutionName, null);
                
              return data;
            }
          case "Total_Item_Requests":
            if(d_type === "Database") {
              return -1;
            } else {
              !reporting_period_start ? data = await getTotalItemRequests(d_type, defRepPeriod[0], defRepPeriod[1], institutionName, null) :
                data = await getTotalItemRequests(d_type, reporting_period_start, reporting_period_end, institutionName, null);
                
              return data;
            }
          case "Unique_Item_Investigations":
            if(d_type === "Database") {
              return -1;
            } else {
              !reporting_period_start ? data = await getUniqueItemInvestigations(d_type, defRepPeriod[0], defRepPeriod[1], institutionName, null) :
                data = await getUniqueItemInvestigations(d_type, reporting_period_start, reporting_period_end, institutionName, null);
                
              return data;
            }
          case "Unique_Item_Requests":
            if(d_type === "Database") {
              return -1;
            } else {
              !reporting_period_start ? data = await getUniqueItemRequests(d_type, defRepPeriod[0], defRepPeriod[1], institutionName, null) :
                data = await getUniqueItemRequests(d_type, reporting_period_start, reporting_period_end, institutionName, null);
                
              return data;
            }
          case "Searches_Platform":
          case "Searches_Regular":
            if(d_type !== "Database" && d_type !== "") {
              return -1;
            } else {
              !reporting_period_start ? data = await getSearchesPlatform(d_type, defRepPeriod[0], defRepPeriod[1], institutionName, null) :
                data = await getSearchesPlatform(d_type, reporting_period_start, reporting_period_end, institutionName, null);
                
              return data;
            }
          case "No_License":
            if(d_type !== "Database" && d_type !== "") {
              return -1;
            } else {
              !reporting_period_start ? data = await getNoLicense(d_type, defRepPeriod[0], defRepPeriod[1], institutionName, null) :
                data = await getNoLicense(d_type, reporting_period_start, reporting_period_end, institutionName, null);
                
              return data;
            }
          default:
            return -1;
        }
      }))
    }));
  }
  return usageStats;
}

//similar to findUsageStatsOverall, except will return a value for each month within 
// given range of dates
const findUsageStatsDateRange = async(data_types: string[], reporting_period_start: Date, reporting_period_end: Date, metric_types: any[], institutionName: string, articles: Article[] | null) => {
  let usageStats: any[][][] = [];
  let monthStart: number, numMonthsInBetween: number, yearStart: number, monthEnd: number, dateStart: number, dateEnd: number;
  
  if(reporting_period_start && reporting_period_end){
    monthStart = reporting_period_start.getMonth();
    monthEnd = reporting_period_end.getMonth();
    numMonthsInBetween = reporting_period_end.getMonth() - reporting_period_start.getMonth();
    numMonthsInBetween < 0 ? numMonthsInBetween = numMonthsInBetween * -1 : numMonthsInBetween; //if negative value
    if(reporting_period_end.getDate() != 1) numMonthsInBetween += 1
    numMonthsInBetween += (12 * (reporting_period_end.getFullYear() - reporting_period_start.getFullYear()));
    yearStart = reporting_period_start.getFullYear();
    dateStart = reporting_period_start.getDate();
    dateEnd = reporting_period_end.getDate();
  } else {
    monthStart = defRepPeriod[0].getMonth();
    monthEnd = defRepPeriod[1].getMonth();
    numMonthsInBetween = defRepPeriod[1].getMonth() - defRepPeriod[0].getMonth();
    numMonthsInBetween < 0 ? numMonthsInBetween = numMonthsInBetween * -1 : numMonthsInBetween; //if negative value
    numMonthsInBetween += (12 * (defRepPeriod[1].getFullYear() - defRepPeriod[0].getFullYear()));
    yearStart = defRepPeriod[0].getFullYear();
    dateStart = defRepPeriod[0].getDate();
    dateEnd = defRepPeriod[1].getDate();
  }

  if(articles){
    for(let j = 0; j < articles.length; j++){
      usageStats[j] = [];
      for(let i = 0; i < metric_types.length; i++){
        usageStats[j][i] = [];
        //reset vars for other cases everytime we loop
        let myStartDate = new Date();
        let myEndDate = new Date();
        let myMonth = monthStart;
        let myYear = yearStart;

        switch(metric_types[i]){
          case "Total_Item_Investigations":
            for(let k = 1; k <= numMonthsInBetween; k++){
              if(data_types[0] === "Database") {
                break;
              } else {
                if(myMonth === 12){
                  myMonth=0; //if we reached January, reset month to 0
                  myYear += 1;
                }
                  
                myMonth === monthStart ?  myStartDate.setDate(dateStart) :  myStartDate.setDate(1);
                myStartDate.setMonth(myMonth);
                myStartDate.setFullYear(myYear);

                myMonth === monthEnd ? myEndDate.setDate(dateEnd) : myEndDate.setDate(1);
                myEndDate.setMonth(myMonth + 1);
                myMonth === 11 ? myEndDate.setFullYear(myYear + 1) : myEndDate.setFullYear(myYear);
                
                usageStats[j][i][k-1] = await getTotalItemInvestigations(data_types[0], myStartDate, myEndDate, institutionName, articles[j]);
                myMonth++;
              }
            }
            break;
          case "Total_Item_Requests":
            for(let k = 1; k <= numMonthsInBetween; k++){
              if(data_types[0] === "Database") {
                break;
              } else {
                if(myMonth === 12){
                  myMonth=0; //if we reached January, reset month to 0
                  myYear += 1;
                }
                  
                myMonth === monthStart ?  myStartDate.setDate(dateStart) :  myStartDate.setDate(1);
                myStartDate.setMonth(myMonth);
                myStartDate.setFullYear(myYear);

                myMonth === monthEnd ? myEndDate.setDate(dateEnd) : myEndDate.setDate(1);
                myEndDate.setMonth(myMonth + 1);
                myMonth === 11 ? myEndDate.setFullYear(myYear + 1) : myEndDate.setFullYear(myYear);
              
                usageStats[j][i][k-1] = await getTotalItemRequests(data_types[0], myStartDate, myEndDate, institutionName, articles[j]);
                myMonth++;
              }
            }
            break;
          case "Unique_Item_Investigations":
            for(let k = 1; k <= numMonthsInBetween; k++){
              if(data_types[0] === "Database") {
                break;
              } else {
                if(myMonth === 12){
                  myMonth=0; //if we reached January, reset month to 0
                  myYear += 1;
                }
                  
                myMonth === monthStart ?  myStartDate.setDate(dateStart) :  myStartDate.setDate(1);
                myStartDate.setMonth(myMonth);
                myStartDate.setFullYear(myYear);

                myMonth === monthEnd ? myEndDate.setDate(dateEnd) : myEndDate.setDate(1);
                myEndDate.setMonth(myMonth + 1);
                myMonth === 11 ? myEndDate.setFullYear(myYear + 1) : myEndDate.setFullYear(myYear);
              
                usageStats[j][i][k-1] = await getUniqueItemInvestigations(data_types[0], myStartDate, myEndDate, institutionName, articles[j]);
                myMonth++;
              }
            }
            break;
          case "Unique_Item_Requests":
            for(let k = 1; k <= numMonthsInBetween; k++){
              if(data_types[0] === "Database") {
                break;
              } else {
                if(myMonth === 12){
                  myMonth=0; //if we reached January, reset month to 0
                  myYear += 1;
                }
                
                myMonth === monthStart ?  myStartDate.setDate(dateStart) :  myStartDate.setDate(1);
                myStartDate.setMonth(myMonth);
                myStartDate.setFullYear(myYear);

                myMonth === monthEnd ? myEndDate.setDate(dateEnd) : myEndDate.setDate(1);
                myEndDate.setMonth(myMonth + 1);
                myMonth === 11 ? myEndDate.setFullYear(myYear + 1) : myEndDate.setFullYear(myYear);
      
                usageStats[j][i][k-1] = await getUniqueItemRequests(data_types[0], myStartDate, myEndDate, institutionName, articles[j]);
                myMonth++;
              }
            }
            break;
          case "Searches_Platform":
          case "Searches_Regular":
            for(let k = 1; k <= numMonthsInBetween; k++){
              if(data_types[0] !== "Database" && data_types[0] !== "") {
                break;
              } else {
                if(myMonth === 12){
                  myMonth=0; //if we reached January, reset month to 0
                  myYear += 1;
                }
                  
                myMonth === monthStart ?  myStartDate.setDate(dateStart) :  myStartDate.setDate(1);
                myStartDate.setMonth(myMonth);
                myStartDate.setFullYear(myYear);

                myMonth === monthEnd ? myEndDate.setDate(dateEnd) : myEndDate.setDate(1);
                myEndDate.setMonth(myMonth + 1);
                myMonth === 11 ? myEndDate.setFullYear(myYear + 1) : myEndDate.setFullYear(myYear);
            
                usageStats[j][i][k-1] = await getSearchesPlatform(data_types[0], myStartDate, myEndDate, institutionName, articles[j]);
                myMonth++;
              }
            }
            break;
          case "No_License":
            for(let k = 1; k <= numMonthsInBetween; k++){
              if(data_types[0] !== "Database" && data_types[0] !== "") {
                break;
              } else {
                if(myMonth === 12){
                  myMonth=0; //if we reached January, reset month to 0
                  myYear += 1;
                }
                  
                myMonth === monthStart ?  myStartDate.setDate(dateStart) :  myStartDate.setDate(1);
                myStartDate.setMonth(myMonth);
                myStartDate.setFullYear(myYear);

                myMonth === monthEnd ? myEndDate.setDate(dateEnd) : myEndDate.setDate(1);
                myEndDate.setMonth(myMonth + 1);
                myMonth === 11 ? myEndDate.setFullYear(myYear + 1) : myEndDate.setFullYear(myYear);
            
                usageStats[j][i][k-1] = await getNoLicense(data_types[0], myStartDate, myEndDate, institutionName, articles[j]);
                myMonth++;
              }
            }
            break;
          default: 
            usageStats[j][i].push(-1);
            break;
        }
      }
    }
  } else {
    for(let j = 0; j < data_types.length; j++){
      usageStats[j] = [];
      for(let i = 0; i < metric_types.length; i++){
        usageStats[j][i] = [];
        //reset vars for other cases
        let myStartDate = new Date();
        let myEndDate = new Date();
        let myMonth = monthStart;
        let myYear = yearStart;

        switch(metric_types[i]){
          case "Total_Item_Investigations":
            for(let k = 1; k <= numMonthsInBetween; k++){
              if(data_types[j] === "Database") {
                break;
              } else {
                if(myMonth === 12){
                  myMonth=0; //if we reached January, reset month to 0
                  myYear += 1;
                }
                  
                myMonth === monthStart ?  myStartDate.setDate(dateStart) :  myStartDate.setDate(1);
                myStartDate.setMonth(myMonth);
                myStartDate.setFullYear(myYear);

                myMonth === monthEnd ? myEndDate.setDate(dateEnd) : myEndDate.setDate(1);
                myEndDate.setMonth(myMonth + 1);
                myMonth === 11 ? myEndDate.setFullYear(myYear + 1) : myEndDate.setFullYear(myYear);
                
                usageStats[j][i][k-1] = await getTotalItemInvestigations(data_types[j], myStartDate, myEndDate, institutionName, null);
                myMonth++;
              }
            }
            break;
          case "Total_Item_Requests":
            for(let k = 1; k <= numMonthsInBetween; k++){
              if(data_types[j] === "Database") {
                break;
              } else {
                if(myMonth === 12){
                  myMonth=0; //if we reached January, reset month to 0
                  myYear += 1;
                }
                  
                myMonth === monthStart ?  myStartDate.setDate(dateStart) :  myStartDate.setDate(1);
                myStartDate.setMonth(myMonth);
                myStartDate.setFullYear(myYear);

                myMonth === monthEnd ? myEndDate.setDate(dateEnd) : myEndDate.setDate(1);
                myEndDate.setMonth(myMonth + 1);
                myMonth === 11 ? myEndDate.setFullYear(myYear + 1) : myEndDate.setFullYear(myYear);
              
                usageStats[j][i][k-1] = await getTotalItemRequests(data_types[j], myStartDate, myEndDate, institutionName, null);
                myMonth++;
              }
            }
            break;
          case "Unique_Item_Investigations":
            for(let k = 1; k <= numMonthsInBetween; k++){
              if(data_types[j] === "Database") {
                break;
              } else {
                if(myMonth === 12){
                  myMonth=0; //if we reached January, reset month to 0
                  myYear += 1;
                }
                  
                myMonth === monthStart ?  myStartDate.setDate(dateStart) :  myStartDate.setDate(1);
                myStartDate.setMonth(myMonth);
                myStartDate.setFullYear(myYear);

                myMonth === monthEnd ? myEndDate.setDate(dateEnd) : myEndDate.setDate(1);
                myEndDate.setMonth(myMonth + 1);
                myMonth === 11 ? myEndDate.setFullYear(myYear + 1) : myEndDate.setFullYear(myYear);
              
                usageStats[j][i][k-1] = await getUniqueItemInvestigations(data_types[j], myStartDate, myEndDate, institutionName, null);
                myMonth++;
              }
            }
            break;
          case "Unique_Item_Requests":
            for(let k = 1; k <= numMonthsInBetween; k++){
              if(data_types[j] === "Database") {
                break;
              } else {
                if(myMonth === 12){
                  myMonth=0; //if we reached January, reset month to 0
                  myYear += 1;
                }
                
                myMonth === monthStart ?  myStartDate.setDate(dateStart) :  myStartDate.setDate(1);
                myStartDate.setMonth(myMonth);
                myStartDate.setFullYear(myYear);

                myMonth === monthEnd ? myEndDate.setDate(dateEnd) : myEndDate.setDate(1);
                myEndDate.setMonth(myMonth + 1);
                myMonth === 11 ? myEndDate.setFullYear(myYear + 1) : myEndDate.setFullYear(myYear);
      
                usageStats[j][i][k-1] = await getUniqueItemRequests(data_types[j], myStartDate, myEndDate, institutionName, null);
                myMonth++;
              }
            }
            break;
          case "Searches_Platform":
          case "Searches_Regular":
            for(let k = 1; k <= numMonthsInBetween; k++){
              if(data_types[j] !== "Database" && data_types[j] !== "") {
                break;
              } else {
                if(myMonth === 12){
                  myMonth=0; //if we reached January, reset month to 0
                  myYear += 1;
                }
                  
                myMonth === monthStart ?  myStartDate.setDate(dateStart) :  myStartDate.setDate(1);
                myStartDate.setMonth(myMonth);
                myStartDate.setFullYear(myYear);

                myMonth === monthEnd ? myEndDate.setDate(dateEnd) : myEndDate.setDate(1);
                myEndDate.setMonth(myMonth + 1);
                myMonth === 11 ? myEndDate.setFullYear(myYear + 1) : myEndDate.setFullYear(myYear);
            
                usageStats[j][i][k-1] = await getSearchesPlatform(data_types[j], myStartDate, myEndDate, institutionName, null);
                myMonth++;
              }
            }
            break;
          case "No_License":
            for(let k = 1; k <= numMonthsInBetween; k++){
              if(data_types[j] !== "Database" && data_types[j] !== "" && data_types[j] !== "Multimedia") {
                break;
              } else {
                if(myMonth === 12){
                  myMonth=0; //if we reached January, reset month to 0
                  myYear += 1;
                }
                  
                myMonth === monthStart ?  myStartDate.setDate(dateStart) :  myStartDate.setDate(1);
                myStartDate.setMonth(myMonth);
                myStartDate.setFullYear(myYear);

                myMonth === monthEnd ? myEndDate.setDate(dateEnd) : myEndDate.setDate(1);
                myEndDate.setMonth(myMonth + 1);
                myMonth === 11 ? myEndDate.setFullYear(myYear + 1) : myEndDate.setFullYear(myYear);
            
                usageStats[j][i][k-1] = await getNoLicense(data_types[j], myStartDate, myEndDate, institutionName, null);
                myMonth++;
              }
            }
            break;
          default: 
            usageStats[j][i].push(-1);
            break;
        }
      }
    }
  }
  return usageStats;
}

//function used to convert a number to a month given a number from a Date type
const monthToString = (monthInt: number) => {
  switch(monthInt){
    case 0:
      return "Jan";
    case 1:
      return "Feb";
    case 2:
      return "Mar";
    case 3:
      return "Apr";
    case 4:
      return "May";
    case 5:
      return "Jun";
    case 6:
      return "Jul";
    case 7:
      return "Aug";
    case 8:
      return "Sep";
    case 9:
      return "Oct";
    case 10:
      return "Nov";
    case 11:
      return "Dec";
    default:
      return null;
  }
}

//Function used for determining the headers row for the body of the counter report
const findColHeadersBody = (report_id: string, reporting_period_start: Date, reporting_period_end: Date) => {
  let monthStart, numMonthsInBetween, yearStart, colHeaders;
  if(reporting_period_start && reporting_period_end){
    monthStart = reporting_period_start.getMonth();
    numMonthsInBetween = reporting_period_end.getMonth() - reporting_period_start.getMonth();
    if(reporting_period_end.getDate() != 1) numMonthsInBetween += 1
    numMonthsInBetween < 0 ? numMonthsInBetween = numMonthsInBetween * -1 : numMonthsInBetween; //if negative value
    numMonthsInBetween += (12 * (reporting_period_end.getFullYear() - reporting_period_start.getFullYear()));
    yearStart = reporting_period_start.getFullYear();
  } else {
    monthStart = defRepPeriod[0].getMonth();
    numMonthsInBetween = defRepPeriod[1].getMonth() - defRepPeriod[0].getMonth();
    numMonthsInBetween < 0 ? numMonthsInBetween = numMonthsInBetween * -1 : numMonthsInBetween; //if negative value
    numMonthsInBetween += (12 * (defRepPeriod[1].getFullYear() - defRepPeriod[0].getFullYear()));
    yearStart = defRepPeriod[0].getFullYear();
  }
  let month = monthStart;
  switch(report_id){
    case "PR":
      colHeaders = `Platform,Data_Type,Access_Method,Metric_Type,Reporting_Period_Total,`;
      for(let i = 1; i <= numMonthsInBetween; i++){
        if(month === 12){
          month=0; //if we reached January, reset i to 0
          yearStart += 1;
        }
        const myMonth = monthToString(month);
        i !== numMonthsInBetween ? colHeaders = colHeaders.concat(`${myMonth}-${yearStart},`) : 
          colHeaders = colHeaders.concat(`${myMonth}-${yearStart}\n`)
        month++;
      }
      return colHeaders;
    case "PR_P1":
      colHeaders = "Platform,Metric_Type,Reporting_Period_Total,";
      for(let i = 1; i <= numMonthsInBetween; i++){
        if(month === 12){
          month=0; //if we reached January, reset i to 0
          yearStart += 1;
        }
        const myMonth = monthToString(month);
        i !== numMonthsInBetween ? colHeaders = colHeaders.concat(`${myMonth}-${yearStart},`) : 
          colHeaders = colHeaders.concat(`${myMonth}-${yearStart}\n`)
        month++;
      }
      return colHeaders;
    case "DR":
      colHeaders = "Database,Publisher,Publisher_ID,Platform,Proprietary_ID,Data_Type,Access_Method,Metric_Type,Reporting_Period_Total,";
      for(let i = 1; i <= numMonthsInBetween; i++){
        if(month === 12){
          month=0; //if we reached January, reset i to 0
          yearStart += 1;
        }
        const myMonth = monthToString(month);
        i !== numMonthsInBetween ? colHeaders = colHeaders.concat(`${myMonth}-${yearStart},`) : 
          colHeaders = colHeaders.concat(`${myMonth}-${yearStart}\n`)
        month++;
      }
      return colHeaders;
    case "DR_D1":
    case "DR_D2":
        colHeaders = "Database,Publisher,Publisher_ID,Platform,Proprietary_ID,Metric_Type,Reporting_Period_Total,";
        for(let i = 1; i <= numMonthsInBetween; i++){
          if(month === 12){
            month=0; //if we reached January, reset i to 0
            yearStart += 1;
          }
          const myMonth = monthToString(month);
          i !== numMonthsInBetween ? colHeaders = colHeaders.concat(`${myMonth}-${yearStart},`) : 
            colHeaders = colHeaders.concat(`${myMonth}-${yearStart}\n`)
          month++;
        }
        return colHeaders;
    case "TR":
      colHeaders = "Title,Publisher,Publisher_ID,Platform,DOI,Proprietary_ID,ISSN,URI,YOP,Data_Type,Metric_Type,Reporting_Period_Total,";
      for(let i = 1; i <= numMonthsInBetween; i++){
        if(month === 12){
          month=0; //if we reached January, reset i to 0
          yearStart += 1;
        }
        const myMonth = monthToString(month);
        i !== numMonthsInBetween ? colHeaders = colHeaders.concat(`${myMonth}-${yearStart},`) : 
          colHeaders = colHeaders.concat(`${myMonth}-${yearStart}\n`)
        month++;
      }
      return colHeaders;
    case "TR_J1":
    case "TR_J4":
      colHeaders = `Title,Publisher,Publisher_ID,Platform,DOI,Proprietary_ID,ISSN,URI,${report_id === "TR_J1" ? "" : "YOP,"}Metric_Type,Reporting_Period_Total,`;
      for(let i = 1; i <= numMonthsInBetween; i++){
        if(month === 12){
          month=0; //if we reached January, reset i to 0
          yearStart += 1;
        }
        const myMonth = monthToString(month);
        i !== numMonthsInBetween ? colHeaders = colHeaders.concat(`${myMonth}-${yearStart},`) : 
          colHeaders = colHeaders.concat(`${myMonth}-${yearStart}\n`);
        month++;
      }
      return colHeaders;
    case "IR":
      colHeaders = "Item,Publisher,Publisher_ID,Platform,Authors,Publication_Date,DOI,Proprietary_ID,ISSN,URI,Parent_Title,Parent_Data_Type,Parent_DOI,Parent_ISSN,Parent_URI,Data_Type,YOP,Access_Method,Metric_Type,Reporting_Period_Total,";
      for(let i = 1; i <= numMonthsInBetween; i++){
        if(month === 12){
          month=0; //if we reached January, reset i to 0
          yearStart += 1;
        }
        const myMonth = monthToString(month);
        i !== numMonthsInBetween ? colHeaders = colHeaders.concat(`${myMonth}-${yearStart},`) : 
          colHeaders = colHeaders.concat(`${myMonth}-${yearStart}\n`)
        month++;
      }
      return colHeaders;
    case "IR_A1":
      colHeaders = "Item,Publisher,Publisher_ID,Platform,Authors,Publication_Date,DOI,Proprietary_ID,ISSN,URI,Parent_Title,Parent_Data_Type,Parent_DOI,Parent_Propietary_ID,Parent_ISSN,Parent_URI,Metric_Type,Reporting_Period_Total,";
      for(let i = 1; i <= numMonthsInBetween; i++){
        if(month === 12){
          month=0; //if we reached January, reset i to 0
          yearStart += 1;
        }
        const myMonth = monthToString(month);
        i !== numMonthsInBetween ? colHeaders = colHeaders.concat(`${myMonth}-${yearStart},`) : 
          colHeaders = colHeaders.concat(`${myMonth}-${yearStart}\n`);
        month++;
      }
      return colHeaders;
    case "IR_M1":
      colHeaders = "Item,Publisher,Publisher_ID,Platform,DOI,Proprietary_ID,URI,Metric_Type,Reporting_Period_Total,";
      for(let i = 1; i <= numMonthsInBetween; i++){
        if(month === 12){
          month=0; //if we reached January, reset i to 0
          yearStart += 1;
        }
        const myMonth = monthToString(month);
        i !== numMonthsInBetween ? colHeaders = colHeaders.concat(`${myMonth}-${yearStart},`) : 
          colHeaders = colHeaders.concat(`${myMonth}-${yearStart}\n`);
        month++;
      }
      return colHeaders;
    default:
      return "";
  }
}

//Generate the body for a COUNTER report
export const generateBody = async(input:CounterInput, institutionName: string) => {
  const platform = "JOMI";
  const ISNI = "0000 0004 4674 2712";
  const endYOP = new Date().getFullYear();
  let YOP: string;
  //set YOP to default range if no date range was given
  input.reporting_period_start ? YOP = `${input.reporting_period_start.getFullYear()} - ${input.reporting_period_end.getFullYear()}` :
    YOP = `2014-${endYOP}`;
  const DOI = "10.24296/jomi";
  const ISSN = "2373-6003";
  const URI= "jomi.com";
  const data_types = findDataTypesBody(input.report_id);
  const access_type = findAccessTypesBody(input.report_id);
  const access_method = findAccessMethodBody(input.report_id);
  const metric_types = findMetricTypesBody(input.report_id);

  //When finding usage stats, if the report is an IR or standard view of IR
  //We need to find stats for each article rather than each data_type
  let articles: Article[] | null = null;
  if(input.report_id === "IR" || input.report_id === "IR_A1" || input.report_id === "IR_M1"){
    try{
      input.reporting_period_start ? articles = await ArticleModel.find({preprint_date:{$gte:input.reporting_period_start,$lt:input.reporting_period_end}}).populate("authors", "display_name") 
        : articles = await ArticleModel.find({preprint_date:{$gte:defRepPeriod[0], $lt:defRepPeriod[1]}}).populate("authors", "display_name");
    } catch (e) {
      logger.error("Error when finding an article for Counter reports: " + e);
    }
  }

  const usageStatsOverall = await findUsageStatsOverall(data_types, input.reporting_period_start, input.reporting_period_end, metric_types, institutionName, articles);

  let usageStatsRange: number[][][];
  usageStatsRange = await findUsageStatsDateRange(data_types, input.reporting_period_start, input.reporting_period_end, metric_types, institutionName, articles);
  
  const colHeaders = findColHeadersBody(input.report_id, input.reporting_period_start, input.reporting_period_end);

  let colBody = "";
  usageStatsOverall.forEach((stat_group, i) => {
    stat_group.forEach((stat, k) => {
      if(stat !== -1 && stat !== 0){
        switch(input.report_id){
          case "PR":
          case "PR_P1":
            colBody = colBody.concat(`${platform},${data_types[0] !== "" ? `${data_types[i]},`:""}${access_type? `${access_type},`: ""}${access_method? `${access_method},`:""}${metric_types[k]},${stat}`)
            if(usageStatsRange){
              usageStatsRange[i][k].forEach((statRange, j) => {
                colBody = colBody.concat(`,${statRange}`)
                if(j === usageStatsRange[i][k].length - 1) {
                  colBody = colBody.concat("\n");
                } 
              })
            } else {
              colBody = colBody.concat("\n");
            }
            break;
          case "DR":
          case "DR_D1":
          case "DR_D2":
            colBody = colBody.concat(`JOMI,JOMI,ISNI:${ISNI},${platform},JOMI:ProdDB,${data_types[0] !== "" ? `${data_types[i]},`:""}${access_method? `${access_method},`:""}${metric_types[k]},${stat}`)
            if(usageStatsRange){
              usageStatsRange[i][k].forEach((statRange, j) => {
                colBody = colBody.concat(`,${statRange}`)
                if(j === usageStatsRange[i][k].length - 1) {
                  colBody = colBody.concat("\n");
                } 
              })
            } else {
              colBody = colBody.concat("\n");
            }
            break;
          case "TR":
          case "TR_J1":
          case "TR_J4":
            colBody = colBody.concat(`Journal of Medical Insight,JOMI,ISNI:${ISNI},${platform},${DOI},JOMI:prop_ID,${ISSN},${URI},${input.report_id === "TR_J1" ? "" : `${YOP},`}${data_types[0] !== "" ? `${data_types[i]},`:""}${metric_types[k]},${stat}`)
            if(usageStatsRange){
              usageStatsRange[i][k].forEach((statRange, j) => {
                colBody = colBody.concat(`,${statRange}`)
                if(j === usageStatsRange[i][k].length - 1) {
                  colBody = colBody.concat("\n");
                } 
              })
            } else {
              colBody = colBody.concat("\n");
            }
            break;
          case "IR":
          case "IR_A1":
            if(articles){
              metric_types.forEach((metric, j) => {
                //@ts-ignore to reach this line, usageStatsOverall has to exist to get to this line
                if(usageStatsOverall[i][k][j] !== -1 && usageStatsOverall[i][k][j] !== 0){
                  //@ts-ignore lint errors on populated authors attribute even though it works perfectly fine
                  colBody = colBody.concat(`"${articles[i].title}",JOMI,ISNI:${ISNI},${platform},"${articles[i].authors.map((author) => author.display_name).join(" | ")}",${articles[i].published ? articles[i].published : articles[i].preprint_date},${DOI}/${articles[i].publication_id},${articles[i].publication_id},${ISSN},${URI}/article/${articles[i].publication_id}/${articles[i].slug},Journal of Medical Insight,Journal,${DOI},${ISSN},${URI},${data_types[0] !== "" ? `${data_types[k]},`:""}${articles[i].published ? articles[i].published?.getFullYear() : articles[i].preprint_date?.getFullYear()},${access_type? `${access_type},`: ""}${access_method? `${access_method},`:""}${metric},${usageStatsOverall[i][k][j]}`)
                
                  if(usageStatsRange){
                    usageStatsRange[i][k].forEach((statRange, l) => {
                      colBody = colBody.concat(`,${statRange}`)
                      if(l === usageStatsRange[i][k].length - 1) {
                        colBody = colBody.concat("\n");
                      } 
                    })
                  } else {
                    colBody = colBody.concat("\n");
                  }
                }
              });
            }
            
            break;
          case "IR_M1":
            if(articles){
              metric_types.forEach((metric, j) => {
                //@ts-ignore to reach this line, usageStatsOverall has to exist
                if(usageStatsOverall[i][k][j] !== -1 && usageStatsOverall[i][k][j] !== 0){
                  //@ts-ignore lint errors on populated authors attribute even though it works perfectly fine
                  colBody = colBody.concat(`${articles[i].title},JOMI,ISNI:${ISNI},${platform},${DOI}/${articles[i].publication_id},${articles[i].publication_id},${URI}/article/${articles[i].publication_id}/${articles[i].slug},${metric},${usageStatsOverall[i][k][j]}`)
                
                  if(usageStatsRange){
                    usageStatsRange[i][k].forEach((statRange, l) => {
                      colBody = colBody.concat(`,${statRange}`)
                      if(l === usageStatsRange[i][k].length - 1) {
                        colBody = colBody.concat("\n");
                      } 
                    })
                  } else {
                    colBody = colBody.concat("\n");
                  }
                }
              });
            }
            break;
          default:
            logger.error("Error when generating body of counter report")
            break;
        }
      }
    })
  });
  return colHeaders.concat(colBody);
}