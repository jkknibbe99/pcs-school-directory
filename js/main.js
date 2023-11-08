const student_lnames_to_ignore = ["Z - Church Account"]  // Ignore any students with last name in this array (currently used to ignore church accnts)
const NUM_FILES = 2;  // Number of files to read
let parse_objs = {};  // global variable to hold parse objects
let file_reads_attempted = 0;  // tracks number of files the program attempted to read


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
 * Builds an array of family objects based on the data read from the uploaded CSV file
 * @param {*} roster_parse_obj 
 * @param {*} church_parse_obj 
 */
function buildFamilies(roster_parse_obj, church_parse_obj) {
    // Build roster (array of student objects)
    let col_headers = roster_parse_obj.data[0];
    col_headers = col_headers.map((el) => el.toLowerCase());
    let roster = roster_parse_obj.data.slice(1);
    let obj_roster = []
    for (let i = 0; i < roster.length; i++) {
        if (roster[i].length > 1) {
            if (!student_lnames_to_ignore.includes(roster[i][col_headers.indexOf('lname')])) {
                let student_obj = {};
                for (let j = 0; j < col_headers.length; j++) {
                    student_obj[col_headers[j]] = roster[i][col_headers.indexOf(col_headers[j])];
                }
                obj_roster.push(student_obj);
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
        const parents_lname = parent_fullname.split(parent_fullname.includes(',') ? ',' : ' ')[parent_fullname.includes(',') ? 0 : 1]
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
    let families = [];
    for (const student of roster) {
        let family_exists = false;
        for (const family of families) {
            if (!('familyid' in student)) {
                $('#error-msg').html('<strong>Error:</strong> Roster missing "FamilyID" column');
                $('#error-msg').show();
                return;
            }
            if (family['familyid'] == student['familyid']) {
                family['children'].push(student);
                family_exists = true;
                break;
            }
        }
        if (!family_exists) {
            families.push({
                familyid: student['familyid'],
                parents: student['parents'],
                street: student['street'],
                city: student['city'],
                state: student['state'],
                zip: student['zip'],
                phone1: formatPhoneNumber(student['phone1']),
                phone2: formatPhoneNumber(student['phone2']),
                email1: student['email1'],
                email2: student['email2'],
                'church affiliation': student['church affiliation'],
                children: [student]
            });
        }
    }
    // Sort families
    families.sort((a, b) => {
        if (a.parents > b.parents) {
            return 1;
        }
        if (a.parents < b.parents) {
            return -1;
        }
        return 0;
    });
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
            child['gradelevel'] = child[gl_key_name];
        }
        family.children.sort((a, b) => {
            let a_grade, b_grade;
            if (a.gradelevel == 'K') {
                a_grade = 0.5;
            } else if (a.gradelevel == 'PK') {
                a_grade = 0.25;
            } else {
                a_grade = parseFloat(a.gradelevel);
            }
            if (b.gradelevel == 'K') {
                b_grade = 0.5;
            } else if (b.gradelevel == 'PK') {
                b_grade = 0.25;
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
    createDirectoryHTML(families);
}


/**
 * Create HTML cards for each family
 * @param {Array} families 
 */
function createDirectoryHTML(families) {
    $('#file-input-container').hide();
    $('#directory-title-page').show();
    let all_families_html = ``;
    for (const family of families) {
        let children_html = ``;
        for (const child of family.children) {
            children_html += `
            <tr>
                <td class="ps-5">` + child.fname + `</td>
                <td class="ps-5">` + child.gradelevel + `</td>
            </tr>
            `;
        }
        let html = `
        <div class="family card">
            <div class="card-body">
                <div class="row">
                    <div class="parents col">` + family.parents + `</div>
                    <div class="church col-auto">` + family['church affiliation'] + `</div>
                </div>

                <div class="row">
                    <div class="address col">
                        ` + family.street + `
                        <br>
                        ` + family.city + ', ' + family.state + ' ' + family.zip + `
                    </div>
                    <div class="phone col-auto">
                        ` + family.phone1 + (family.phone1 && family.phone2 ? `<br>` : '' ) + family.phone2 + `
                    </div>
                </div>
    
                <div class="email">
                    <strong>Email: </strong>` + family.email1 + (family.email1 && family.email2 ? ', ' : '' ) + family.email2 + `
                </div>
                <div class="children">
                    <table>
                        ` + children_html + `
                    </table>
                </div>
            </div>
        </div>
        `;
        all_families_html += html;
    }
    organizePages(all_families_html);
}


/**
 * Organizes all family cards into columns and pages. Adds page numbers.
 */
function organizePages(html, families_complete) {
    function addNewDirPage(html) {
        $('body').append('<div class="full-page container" contenteditable="true"><div class="col-container row justify-content-center align-items-start"><div class="column col l-col">' + ( html ? html : '' ) + '</div></div><div class="page-num mb-3">' + (parseInt($('.page-num:last').html()) + 1) + '</div></div>');
    }
    const current_col = $('.column').last();
    // create first directory page
    if (current_col.length == 0) {
        addNewDirPage(html);
        organizePages();
    }
    const col_height = parseFloat(current_col.height());
    let height_sum = 0;
    let col_max_reached = false;
    let done = false;
    const num_families_in_col = current_col.find('.family').length;
    current_col.find('.family').each(function (index) {
        if (col_max_reached) {
            $('.column').last().append($(this));
        } else {
            height_sum += $(this).height() + parseFloat($(this).css('margin-bottom').replace('px', ''));
            height_sum += parseFloat($(this).css('margin-bottom').replace('px', ''));
            height_sum = parseFloat(height_sum);
            if (height_sum > col_height) {
                col_max_reached = true;
                // Create new column
                const col_side_class = (current_col.hasClass('l-col') ? 'r-col' : 'l-col');
                if (col_side_class == 'l-col') {
                    if (!families_complete) {
                        addNewDirPage()
                    } else {
                        done = true;
                    }
                } else {
                    $('.col-container').last().append('<div class="column col ' + col_side_class + '"></div>');
                }
                $('.column').last().append($(this));
            }
        }
        if (index == num_families_in_col - 1) {
            if (col_max_reached) {
                if (!done) {
                    organizePages('', families_complete);
                } else {
                    $('.family').last().remove();
                    return;
                }
            } else {
                const blank_fam_card = `
                <div class="family card">
                    <div class="card-body">
                        <div style="height: 90px"></div
                    </div>
                </div>
                `
                $('.column').last().append(blank_fam_card);
                organizePages('', true);
            }
        }
    });
}


/**
 * File input change -> hide error alert
 */
function fileChange () {
    $('#error-msg').hide();
};


// Printing
window.onbeforeprint = function(){
    $('#print-btn').hide();
};
window.onafterprint = function(){
    $('#print-btn').show();
};
