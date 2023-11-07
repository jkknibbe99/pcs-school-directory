
function organizeColumn() {
    const current_col = $('#directory .full-page .column').last();
    const col_height = parseFloat(current_col.height());
    let height_sum = 0;
    let col_max_reached = false;
    const num_families_in_col = current_col.find('.family').length;
    current_col.find('.family').each(function (index) {
        if (col_max_reached) {
            $('#directory .full-page .column').last().append($(this));
        } else {
            height_sum += $(this).height();
            height_sum += parseFloat($(this).css('margin-bottom').replace('px', ''));
            height_sum = parseFloat(height_sum);
            if (height_sum > col_height) {
                col_max_reached = true;
                // Create new column
                const col_side_class = (current_col.hasClass('l-col') ? 'r-col' : 'l-col');
                if (col_side_class == 'l-col') {
                    $('#directory').append('<div class="full-page d-flex justify-content-center align-items-start"><div class="column flex-fill ' + col_side_class + '"></div></div>');
                } else {
                    $('#directory .full-page:last-of-type').append('<div class="column flex-fill ' + col_side_class + '"></div>');
                }
                $('#directory .full-page .column').last().append($(this));
            }
        }
        if (index == num_families_in_col - 1) {
            if (col_max_reached) {
                organizeColumn();
            }
        }
    });
}

max_cols = 10;
iter = 0

window.onload = () => {
    organizeColumn();
}