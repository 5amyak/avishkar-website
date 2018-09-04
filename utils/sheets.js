/*
  Copyright 2016 Google, Inc.

  Licensed to the Apache Software Foundation (ASF) under one or more contributor
  license agreements. See the NOTICE file distributed with this work for
  additional information regarding copyright ownership. The ASF licenses this
  file to you under the Apache License, Version 2.0 (the "License"); you may not
  use this file except in compliance with the License. You may obtain a copy of
  the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
  License for the specific language governing permissions and limitations under
  the License.
*/

var { google } = require("googleapis");
const Org = require("../models/org");
var { OAuth2Client } = require("google-auth-library");
var util = require("util");
const config = require("config");

/**
 * Create a new Sheets helper.
 * @param {string} accessToken An authorized OAuth2 access token.
 * @constructor
 */
var SheetsHelper = function(org) {
  var auth = new OAuth2Client(
    config.get("Config.google_details.client_id"),
    config.get("Config.google_details.client_secret")
  );
  auth.credentials = {
    access_token: org.accessToken
  };
  auth.setCredentials({
    refresh_token: org.refreshToken
  });
  auth.on("tokens", tokens => {
    if (tokens.refresh_token) {
      org.set({ refreshToken: tokens.refresh_token });
      org.save(function(err) {
        if (err) {
        }
      });
    }
    auth.setCredentials({
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token
    });
  });
  this.service = google.sheets({ version: "v4", auth: auth });
};

module.exports = SheetsHelper;

/**
 * Create a spreadsheet with the given name.
 * @param  {string}   title    The name of the spreadsheet.
 * @param  {Function} callback The callback function.
 */
SheetsHelper.prototype.createSpreadsheet = function(title, columns, callback) {
  var self = this;
  var request = {
    resource: {
      properties: {
        title: title
      },
      sheets: [
        {
          properties: {
            title: "Data",
            gridProperties: {
              columnCount: columns.length,
              frozenRowCount: 1
            }
          }
        }
        // Add pivot sheet.
        // {
        //   properties: {
        //     title: "Pivot",
        //     gridProperties: {
        //       hideGridlines: true
        //     }
        //   }
        // }
      ]
    }
  };
  self.service.spreadsheets.create(request, function(err, response) {
    if (err) {
      return callback(err);
    }
    var spreadsheet = response.data;
    // Add header rows.
    var dataSheetId = spreadsheet.sheets[0].properties.sheetId;
    var requests = [buildHeaderRowRequest(dataSheetId, columns)];
    // Add pivot table and chart.
    // var pivotSheetId = spreadsheet.sheets[1].properties.sheetId;
    // requests = requests.concat([
    //   buildPivotTableRequest(dataSheetId, pivotSheetId),
    //   buildFormatPivotTableRequest(pivotSheetId),
    //   buildAddChartRequest(pivotSheetId)
    // ]);
    var request = {
      spreadsheetId: spreadsheet.spreadsheetId,
      resource: {
        requests: requests
      }
    };
    self.service.spreadsheets.batchUpdate(request, function(err, response) {
      if (err) {
        return callback(err);
      }
      return callback(null, spreadsheet);
    });
  });
};
//custom colum creator
SheetsHelper.prototype.createColumns = function(teamSize) {
  let userFields = [];
  for (let i = 0; i < teamSize; i++) {
    const num = i + 1;
    const userInfo = [
      { field: `member ${num}`, header: `member ${num}` },
      { field: `email ${num}`, header: `email ${num}` },
      { field: `phone ${num}`, header: `phone ${num}` },
      { field: `regNum ${num}`, header: `regNum ${num}` },
      { field: `course ${num}`, header: `course ${num}` },
      { field: `year ${num}`, header: `year ${num}` },
      { field: `college ${num}`, header: `college ${num}` }
    ];
    userFields = userFields.concat(userInfo);
  }
  let columns = [{ field: "team", header: "Team" }];
  columns = columns.concat(userFields);
  return columns;
};
// var COLUMNS = [
//   { field: "team", header: "Team" },
//   { field: "member 1", header: "Member 1" },
//   { field: "member 2", header: "Member 2" },
//   { field: "phone", header: "Phone" },
//   { field: "email", header: "Email" }
// ];

/**
 * Builds a request that sets the header row.
 * @param  {string} sheetId The ID of the sheet.
 * @param {Array} columns columns to create cells
 * @return {Object}         The reqeuest.
 */
function buildHeaderRowRequest(sheetId, columns) {
  var cells = columns.map(function(column) {
    return {
      userEnteredValue: {
        stringValue: column.header
      },
      userEnteredFormat: {
        textFormat: {
          bold: true
        }
      }
    };
  });
  return {
    updateCells: {
      start: {
        sheetId: sheetId,
        rowIndex: 0,
        columnIndex: 0
      },
      rows: [
        {
          values: cells
        }
      ],
      fields: "userEnteredValue,userEnteredFormat.textFormat.bold"
    }
  };
}

/**
 * Sync the orders to a spreadsheet.
 * @param  {string}   spreadsheetId The ID of the spreadsheet.
 * @param  {string}   sheetId       The ID of the sheet.
 * @param  {Array}    orders        The list of orders.
 * @param  {Array}     columns columns to create cells
 * @param  {Function} callback      The callback function.
 */
SheetsHelper.prototype.sync = function(
  spreadsheetId,
  sheetId,
  teams,
  columns,
  callback
) {
  var requests = [];
  // Resize the sheet.
  requests.push({
    updateSheetProperties: {
      properties: {
        sheetId: sheetId,
        gridProperties: {
          rowCount: teams.length + 1,
          columnCount: columns.length
        }
      },
      fields: "gridProperties(rowCount,columnCount)"
    }
  });
  // Set the cell values.
  requests.push({
    updateCells: {
      start: {
        sheetId: sheetId,
        rowIndex: 1,
        columnIndex: 0
      },
      rows: buildRowsForTeams(teams, columns),
      fields: "*"
    }
  });
  // Send the batchUpdate request.
  var request = {
    spreadsheetId: spreadsheetId,
    resource: {
      requests: requests
    }
  };
  this.service.spreadsheets.batchUpdate(request, function(err) {
    if (err) {
      return callback(err);
    }
    return callback();
  });
};

function buildRowsForTeams(teams, columns) {
  return teams.map(function(team) {
    team.userRefs.forEach(function(user, i) {
      console.log({ user });
      const num = i + 1;
      team[`member${num}`] = user.name;
      team[`email${num}`] = user.email;
      team[`phone${num}`] = user.phone;
      team[`regNum${num}`] = user.regNum;
      team[`course${num}`] = user.course;
      team[`year${num}`] = user.courseYear;
      team[`college${num}`] = user.college;
    });

    var cells = columns.map(function(column) {
      switch (column.field) {
        case "team":
          return {
            userEnteredValue: {
              stringValue: team.name || ""
            }
          };
          break;
        case "member 1":
          return {
            userEnteredValue: {
              stringValue: team.member1 || ""
            }
          };
          break;
        case "email 1":
          return {
            userEnteredValue: {
              stringValue: team.email1 || ""
            }
          };
          break;
        case "phone 1":
          return {
            userEnteredValue: {
              stringValue: team.phone1 || ""
            }
          };
          break;
        case "regNum 1":
          return {
            userEnteredValue: {
              stringValue: team.regNum1 || ""
            }
          };
          break;
        case "course 1":
          return {
            userEnteredValue: {
              stringValue: team.course1 || ""
            }
          };
          break;
        case "year 1":
          return {
            userEnteredValue: {
              stringValue: team.year1 || ""
            }
          };
          break;
        case "college 1":
          return {
            userEnteredValue: {
              stringValue: team.college1 || ""
            }
          };
          break;
        case "member 2":
          return {
            userEnteredValue: {
              stringValue: team.member2 || ""
            }
          };
          break;
        case "email 2":
          return {
            userEnteredValue: {
              stringValue: team.email2 || ""
            }
          };
          break;
        case "phone 2":
          return {
            userEnteredValue: {
              stringValue: team.phone2 || ""
            }
          };
          break;
        case "regNum 2":
          return {
            userEnteredValue: {
              stringValue: team.regNum2 || ""
            }
          };
          break;
        case "course 2":
          return {
            userEnteredValue: {
              stringValue: team.course2 || ""
            }
          };
          break;
        case "year 2":
          return {
            userEnteredValue: {
              stringValue: team.year2 || ""
            }
          };
          break;
        case "college 2":
          return {
            userEnteredValue: {
              stringValue: team.college2 || ""
            }
          };
          break;
        case "member 3":
          return {
            userEnteredValue: {
              stringValue: team.member3 || ""
            }
          };
          break;
        case "email 3":
          return {
            userEnteredValue: {
              stringValue: team.email3 || ""
            }
          };
          break;
        case "phone 3":
          return {
            userEnteredValue: {
              stringValue: team.phone3 || ""
            }
          };
          break;
        case "regNum 3":
          return {
            userEnteredValue: {
              stringValue: team.regNum3 || ""
            }
          };
          break;
        case "course 3":
          return {
            userEnteredValue: {
              stringValue: team.course3 || ""
            }
          };
          break;
        case "year 3":
          return {
            userEnteredValue: {
              stringValue: team.year3 || ""
            }
          };
          break;
        case "college 3":
          return {
            userEnteredValue: {
              stringValue: team.college3 || ""
            }
          };
          break;
        case "member 4":
          return {
            userEnteredValue: {
              stringValue: team.member4 || ""
            }
          };
          break;
        case "email 4":
          return {
            userEnteredValue: {
              stringValue: team.email4 || ""
            }
          };
          break;
        case "phone 4":
          return {
            userEnteredValue: {
              stringValue: team.phone4 || ""
            }
          };
          break;
        case "regNum 4":
          return {
            userEnteredValue: {
              stringValue: team.regNum4 || ""
            }
          };
          break;
        case "course 4":
          return {
            userEnteredValue: {
              stringValue: team.course4 || ""
            }
          };
          break;
        case "year 4":
          return {
            userEnteredValue: {
              stringValue: team.year4 || ""
            }
          };
          break;
        case "college 4":
          return {
            userEnteredValue: {
              stringValue: team.college4 || ""
            }
          };
          break;
        default:
          return {
            userEnteredValue: {
              stringValue: "default value called"
            }
          };
      }
    });
    return {
      values: cells
    };
  });
}
