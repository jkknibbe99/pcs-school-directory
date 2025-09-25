const FAMILY_CARD_FORMAT = false;  // Use bootstrap card boxes to encapsulate each family html block
const NUM_FILES = 2;  // Number of files to read
let parse_objs = {};  // global variable to hold parse objects
let file_reads_attempted = 0;  // tracks number of files the program attempted to read
let families;


/**
 * Reads the contents of the selected file
 * Returns a parse_obj if file read was successful
 */
function readFileContents(file_input_elem, file_category) {
    var roster_file = file_input_elem.files[0];
    if (roster_file) {
        if (roster_file.name.endsWith('.csv')) {
            var reader = new FileReader();
            reader.readAsText(roster_file, "UTF-8");
            reader.onload = function (evt) {
                const file_contents = evt.target.result;
                if (file_contents.length == 0) {
                    $('#error-msg').html('<strong>Error:</strong>' + file_category + ' file is empty');
                    $('#error-msg').show();
                } else {
                    const parse_obj = Papa.parse(file_contents);
                    if (parse_obj.errors.length > 0) {
                        let error_str = '<ul>';
                        for (let i = 0; i < parse_obj.errors.length; i++) {
                            error_str += '<li>';
                            for (const key in parse_obj.errors[i]) {
                                error_str += key + ': ' + parse_obj.errors[i][key] + '<br>';
                            }
                            error_str += '</li>';
                        }
                        error_str += '</ul>';
                        $('#error-msg').html('<strong>Error:</strong> Could not parse ' + file_category + ' file' + error_str);
                        $('#error-msg').show();
                    } else {
                        // File was read and parsed correctly
                        // Add parse_obj to global
                        parse_objs[file_category] = parse_obj;
                        fileReadAttemptComplete();
                    }
                }
            }
            reader.onerror = function (evt) {
                $('#error-msg').html('<strong>Error:</strong> Could not read ' + file_category + ' file');
                $('#error-msg').show();
            }
        } else {
            $('#error-msg').html('<strong>Error:</strong> ' + file_category + ' file must be a .csv');
            $('#error-msg').show();
        }
    } else {
        if (file_category != 'church') {
            $('#error-msg').html('<strong>Error:</strong> No ' + file_category + ' file selected');
            $('#error-msg').show();
        }
        fileReadAttemptComplete();
    }
}


/**
 * Reads all files
 */
function readAllFiles() {
    parse_objs = {};
    file_reads_attempted = 0;
    readFileContents(document.getElementById('roster-file-input'), 'roster');
    readFileContents(document.getElementById('church-file-input'), 'church');
}


/**
 * Callback function for when a file read attempt is completed
 */
function fileReadAttemptComplete() {
    file_reads_attempted++;
    if (file_reads_attempted == NUM_FILES) {
        allFilesRead();
    }
}


/**
 * callback once all files have been read or at least attempted
 */
function allFilesRead() {
    if (!('church' in parse_objs)) {
        const church_modal = new bootstrap.Modal(document.getElementById('church-modal'));
        church_modal.show();
    } else {
        buildFamilies(parse_objs['roster'], parse_objs['church']);
    }
}


/**
 * Formats the given phone number
 * @param {string} phoneNumberString
 */
function formatPhoneNumber(phoneNumberString) {
    var cleaned = ('' + phoneNumberString).replace(/\D/g, '');
    var match = cleaned.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/);
    if (match) {
        var intlCode = (match[1] ? '+1 ' : '');
        return [intlCode, '(', match[2], ') ', match[3], '-', match[4]].join('');
    }
    return null;
}


/**
 * Cleans up the given name for comparison
 * @param {string} name 
 */
function cleanName(name) {
    name = name.toLowerCase();
    name = name.replaceAll(' ', '').replaceAll("'", '');
    return name;
}


/**
 * Builds an array of family objects based on the data read from the uploaded CSV file
 * @param {object} roster_parse_obj 
 * @param {object} church_parse_obj 
 */
function buildFamilies(roster_parse_obj, church_parse_obj) {
    // Build roster (array of student objects)
    let col_headers = roster_parse_obj.data[0];
    col_headers = col_headers.map((el) => el.toLowerCase());
    let roster = roster_parse_obj.data.slice(1);
    let obj_roster = []
    for (let i = 0; i < roster.length; i++) {
        if (roster[i].length > 1) {
            // add student to roster only if has parents (if parents is blank, it is most likely a test or church account)
            if (roster[i][col_headers.indexOf('parents')]) {
                // ignore if has (Billing Acct) in first name
                if (!roster[i][col_headers.indexOf('fname')].includes('(Billing Acct)')) {
                    let student_obj = {};
                    for (let j = 0; j < col_headers.length; j++) {
                        student_obj[col_headers[j]] = roster[i][col_headers.indexOf(col_headers[j])];
                    }
                    obj_roster.push(student_obj);
                }
            }
        }
    }
    roster = obj_roster;
    
    // create church student list if church_parse_obj passed
    let church_list;
    if (church_parse_obj) {
        // build church student list
        let col_headers = church_parse_obj.data[0];
        col_headers = col_headers.map((el) => el.toLowerCase());
        church_list = church_parse_obj.data.slice(1);
        let church_obj_list = []
        for (let i = 0; i < church_list.length; i++) {
            if (church_list[i].length > 1) {
                let student_obj = {};
                for (let j = 0; j < col_headers.length; j++) {
                    student_obj[col_headers[j]] = church_list[i][col_headers.indexOf(col_headers[j])];
                }
                church_obj_list.push(student_obj)
            }
        }
        church_list = church_obj_list;
    }
    // format parents string and add church affiliation if church parse_obj was passed
    for (const student of roster) {
        // format parents string
        const parent_fullname = student['father'] ? student['father'] : student['mother'];
        let parents_lname = parent_fullname.split(parent_fullname.includes(',') ? ',' : ' ')[parent_fullname.includes(',') ? 0 : 1]
        if (!parents_lname) {
            parents_lname = student['lname'];
            if (!parents_lname) {
                $('#error-msg').html(`<strong>Error:</strong> No last name found for parents of student (${student['studentid']}) ${student[fullname]}`);
                $('#error-msg').show();
                return;
            }
        }
        student['parents_lname'] = parents_lname;
        let father_fname = '';
        if (student['father'].length > 0) {
            father_fname = student['father'].toLowerCase().replace(parents_lname.toLowerCase(), '').replace(',', '').replace(' ', '');
            father_fname = father_fname.substring(0, 1).toUpperCase() + father_fname.substring(1);
        }
        let mother_fname = '';
        if (student['mother'].length > 0) {
            mother_fname = student['mother'].toLowerCase().replace(parents_lname.toLowerCase(), '').replace(',', '').replace(' ', '');
            mother_fname = mother_fname.substring(0, 1).toUpperCase() + mother_fname.substring(1);
        }
        student['parents'] = parents_lname + ', ' + father_fname + ( father_fname && mother_fname ? ' & ' : '') + mother_fname;
        
        // format family2 parents string
        if (student['family2parents']) {
            const parent2_fullname = student['family2name1'] ? student['family2name1'] : student['family2name2'];
            let parents2_lname = parent2_fullname.split(parent2_fullname.includes(',') ? ',' : ' ')[parent2_fullname.includes(',') ? 0 : 1]
            if (!parents2_lname) {
                parents2_lname = student['lname'];
                if (!parents2_lname) {
                    $('#error-msg').html(`<strong>Error:</strong> No last name found for "family2" parents of student  "${student['fullname']}" (${student['studentid']})`);
                    $('#error-msg').show();
                    return;
                }
            }
            student['parents2_lname'] = parents2_lname;
            let parents2_fname1 = '';
            if (student['family2name1'].length > 0) {
                parents2_fname1 = student['family2name1'].toLowerCase().replace(parents2_lname.toLowerCase(), '').replace(',', '').replace(' ', '');
                parents2_fname1 = parents2_fname1.substring(0, 1).toUpperCase() + parents2_fname1.substring(1);
            }
            let parents2_fname2 = '';
            if (student['family2name2'].length > 0) {
                parents2_fname2 = student['family2name2'].toLowerCase().replace(parents2_lname.toLowerCase(), '').replace(',', '').replace(' ', '');
                parents2_fname2 = parents2_fname2.substring(0, 1).toUpperCase() + parents2_fname2.substring(1);
            }
            student['parents2'] = parents2_lname + ', ' + parents2_fname1 + (parents2_fname1 && parents2_fname2 ? ' & ' : '') + parents2_fname2;
        }
        
        // Add church affiliation
        if (church_list) {
            for (const student_cl of church_list) {
                if (student_cl.studentid == student.studentid) {
                    student['church affiliation'] = student_cl.religionchurch;
                }
            }
        }
    }

    // Build array of families
    families = [];
    for (const student of roster) {
        // first check if the student's family already exists in the array
        let family_exists = false;
        for (const family of families) {
            if (!('familyid' in student)) {
                $('#error-msg').html('<strong>Error:</strong> Roster missing "FamilyID" column');
                $('#error-msg').show();
                return;
            }
            // if family already exists, add student to family's children array
            if (family['familyid'] == student['familyid']) {
                family['children'].push(student);
                // if family2 exists add to that as well
                for (const family2 of families) {
                    if (family2['familyid'] == student['familyid'] + '_2') {
                        family2['children'].push(student);
                        break;
                    }
                }
                family_exists = true;
                break;
            }
        }
        // family doesn't exist, create new
        if (!family_exists) {
            families.push({
                familyid: student['familyid'],
                parents: student['parents'],
                father_fname: student['father'].includes(',') ? student['father'].split(',')[1] : student['father'].split(' ')[0],
                mother_fname: student['mother'].includes(',') ? student['mother'].split(',')[1] : student['mother'].split(' ')[0],
                street: student['street'],
                city: student['city'],
                state: student['state'],
                zip: student['zip'],
                phone1: formatPhoneNumber(student['phone1']),
                phone2: formatPhoneNumber(student['phone2']),
                email1: student['email1'],
                email2: student['email1'] != student['email2'] ? student['email2'] : undefined,
                'church affiliation': student['church affiliation'],
                children: [student]
            });
            // If student has family2 info (separated parents) create 2nd family
            if (student['family2parents']) {
                families.push({
                    familyid: student['familyid'] + '_2',
                    parents: student['parents2'],
                    father_fname: student['family2name1'].includes(',') ? student['family2name1'].split(',')[1] : student['family2name1'].split(' ')[0],
                    mother_fname: student['family2name2'].includes(',') ? student['family2name2'].split(',')[1] : student['family2name2'].split(' ')[0],
                    street: student['street2'],
                    city: student['city2'],
                    state: student['state2'],
                    zip: student['zip2'],
                    phone1: formatPhoneNumber(student['family2phone1']),
                    phone2: formatPhoneNumber(student['family2phone2']),
                    email1: student['family2emails'],
                    'church affiliation': student['church affiliation'],
                    children: [student]
                });
            }
        }
    }
    // Sort families
    families.sort((a, b) =>
        cleanName(a.parents).localeCompare(cleanName(b.parents), undefined, { sensitivity: "base" })
    );
    // Sort children
    for (const family of families) {
        // Sort by fname
        family.children.sort((a, b) => {
            if (a.fname > b.fname) {
                return 1;
            }
            if (a.fname < b.fname) {
                return -1;
            }
            return 0;
        });
        // Sort by grade level
        let gl_key_name;
        if ('gradelevel' in family.children[0]) {
            gl_key_name = 'gradelevel';
        } else if ('gradelevx' in family.children[0]) {
            gl_key_name = 'gradelevx';
        } else {
            throw Error('Student object does not contain "gradelevel" or "gradelevx" property');
        }
        for (const child of family.children) {
            child.gradelevel = child[gl_key_name];
            // Swap PK to Y5, PS to PK
            if (child.gradelevel === 'PK') {
                child.gradelevel = 'Y5';
            } else if (child.gradelevel === 'PS') {
                child.gradelevel = 'PK';
            }
        }
        const grade_level_nums = {
            'K': 0.5,
            'Y5': 0.25,
            'PK': 0.1
        }
        family.children.sort((a, b) => {
            let a_grade, b_grade;
            if (a.gradelevel in grade_level_nums) {
                a_grade = grade_level_nums[a.gradelevel];
            } else {
                a_grade = parseFloat(a.gradelevel);
            }
            if (b.gradelevel in grade_level_nums) {
                b_grade = grade_level_nums[b.gradelevel];
            } else {
                b_grade = parseFloat(b.gradelevel);
            }
            if (a_grade > b_grade) {
                return -1;
            }
            if (a_grade < b_grade) {
                return 1;
            }
            return 0;
        });
    }
    console.log(families);
    createDirectoryHTML();
}


/**
 * Create HTML blocks for each family
 */
function createDirectoryHTML() {
    $('#file-input-container').hide();
    $('#directory-title-page').show();
    let all_families_html = ``;
    for (const family of families) {
        let children_html = ``;
        for (const child of family.children) {
            children_html += `
            <tr>
                <td class="ps-5">` + child.fname + (cleanName(child.lname) != cleanName(child.parents_lname) ? ' ' + child.lname : '' ) + `</td>
                <td class="ps-5">` + child.gradelevel + `</td>
            </tr>
            `;
        }
        let html = `
        <div class="family${( FAMILY_CARD_FORMAT ? ' card' : '' )}" style="margin-bottom: ${$('#family-spacing').val()}px; font-size: ${$('#font-size').val()}px;">
            <div${(FAMILY_CARD_FORMAT ? ' class="card-body"' : '')}>
                <div class="row">
                    <div class="parents col-auto">${family.parents}</div>
                    <div class="church col text-end">${family['church affiliation']}</div>
                </div>

                <div class="row">
                    <div class="address col">
                        ${family.street}
                        <br>
                        ${family.city + (family.city ? ', ' : '') + family.state + ' ' + family.zip}
                    </div>
                    <div class="phone col-auto">
                        ${(family.phone1 ? family.father_fname + ': ' + family.phone1 : '') + (family.phone1 && family.phone2 ? '<br>' : '') + (family.phone2 ? family.mother_fname + ': ' + family.phone2 : '' )}
                    </div>
                </div>
    
                <div class="email">
                    <span class="email-title">Email: </span>${(family.email1 ? family.email1 : '') + (family.email1 && family.email2 ? ', ' : '') + (family.email2 ? family.email2 : '' )}
                </div>
                <div class="children">
                    <table>
                        ${children_html}
                    </table>
                </div>
            </div>
        </div>
        `;
        all_families_html += html;
    }
    addNewDirPage(all_families_html)
    organizeColumnsAndPagesLoop();
}


/**
 * Clears out all the family pages from the directory
 */
function clearDirectoryHTML() {
    $('.family-page').remove();
}


/**
 * Adds a new directory page
 * @param {*} html 
 */
function addNewDirPage(html) {
    $('body').append(
        `<div class="full-page container family-page" contenteditable="true" style="font-family: ${$('#font-style').val()};">
            <div class="col-container">
                <div class="column l-col" style="padding-right: ${($('#column-spacing').val() / 2)}px;">
                    ${(html ? html : '')}
                </div></div><div class="page-num mb-3">${(parseInt($('.page-num:last').html()) + 1)}</div></div>`);
}


/**
 * Recursive function. Organizes directory into columns and pages
 */
function organizeColumnsAndPagesLoop() {
    const current_col = $('.column').last();
    const curr_col_index = $('.column').length - 1;
    const curr_col_height = current_col.height();
    const curr_col_fams = current_col.find('.family');
    let content_height = 0;
    for (let i = 0; i < curr_col_fams.length; i++) {
        content_height += $(curr_col_fams[i]).height();
        if (content_height > curr_col_height) {
            // Add a new column if necessary
            if ($('.column').length - 1 == curr_col_index)
                if (current_col.hasClass('r-col')) {
                    // Add a new page and l-col
                    addNewDirPage();
                } else {
                    // Add a r-col
                    current_col.closest('.col-container').append('<div class="column r-col" style="padding-left: ' + ($('#column-spacing').val() / 2) + 'px;"></div></div>')
                }
            // move overflow families to next column
            for (let j = i; j < curr_col_fams.length; j++) {
                document.querySelectorAll('.column')[document.querySelectorAll('.column').length-1].appendChild(curr_col_fams[j]);
            }
            // recursively loop
            organizeColumnsAndPagesLoop();
            return;
        } else {
            content_height += parseFloat($(curr_col_fams[i]).css('margin-bottom').replace('px', ''));
        }
    }
    // families fit in current column, if curr col is l-col, add r-col and blank family to finish up.
    if (current_col.hasClass('l-col')) {
        // Add a r-col
        current_col.closest('.col-container').append('<div class="column r-col" style="padding-left: ' + ($('#column-spacing').val() / 2) + 'px;"></div></div>')
        // Add blank family
        const blank_fam_card = `
        <div class="family` + (FAMILY_CARD_FORMAT ? ' card' : '') + `">
            <div` + (FAMILY_CARD_FORMAT ? ' class="card-body"' : '') + `>
                <div style="height: 90px"></div
            </div>
        </div>
        `
        $('.column').last().append(blank_fam_card);
    }
}


/**
 * File input change -> hide error alert
 */
function fileChange () {
    $('#error-msg').hide();
};


/* Options input changes */
function redoDirectoryHTML() {
    clearDirectoryHTML();
    createDirectoryHTML();
}
// font style
$('#font-style').on('change', function () {
    $('.full-page').css('font-family', $(this).val());
    redoDirectoryHTML();
});
// font-size
$('#font-size').on('input', function () {
    redoDirectoryHTML();
});
// family spacing
$('#family-spacing').on('input', function () {
    redoDirectoryHTML();
});
// column spacing
$('#column-spacing').on('input', function () {
    redoDirectoryHTML();
});


// Printing
window.onbeforeprint = function(){
    $('.full-page').css('border', 'none');
    $('.dont-print').hide();
};
window.onafterprint = function(){
    $('.full-page').css('border', '1px solid lightgray');
    $('.dont-print').show();
};


// window onload function
window.onload = function () {
    // Set full page font
    $('.full-page').css('font-family', $('#font-style').val());
    // Set font options font
    $('#font-style option').each(function() {
        $(this).css('font-family', $(this).text());
    });
}
