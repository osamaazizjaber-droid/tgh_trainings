import * as XLSX from 'xlsx';
import { format } from 'date-fns';

// Helper: build full name from 4 parts
const fullName = (u) =>
  [u?.first_name, u?.second_name, u?.third_name, u?.fourth_name].filter(Boolean).join(' ');

/**
 * Export attendance data to Excel
 */
export const exportAttendance = (attendanceData, trainingTitle, t) => {
  const rows = attendanceData.map((row) => ({
    [t('first_name')]: row.users?.first_name || '',
    [t('father_name')]: row.users?.second_name || '',
    [t('grandfather_name')]: row.users?.third_name || '',
    [t('family_name')]: row.users?.fourth_name || '',
    [t('full_name')]: fullName(row.users),
    [t('phone_number')]: row.users?.phone || '',
    [t('gender')]: row.users?.gender === 'Male' ? t('male') : (row.users?.gender === 'Female' ? t('female') : ''),
    [t('age')]: row.users?.age || '',
    [t('dob')]: row.users?.dob || '',
    [t('governorate')]: row.users?.governorate || '',
    [t('district')]: row.users?.district || '',
    [t('subdistrict')]: row.users?.subdistrict || '',
    [t('village_area')]: row.users?.village || '',
    [t('representation')]: row.users?.representation || '',
    [t('job_function')]: row.users?.job_function || '',
    [t('day')]: row.day_number,
    [t('date')]: row.date ? format(new Date(row.date), 'yyyy-MM-dd') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t('attendance'));
  XLSX.writeFile(wb, `attendance_${trainingTitle}_${Date.now()}.xlsx`);
};

/**
 * Export test results to Excel
 */
export const exportTestResults = (resultsData, trainingTitle, t) => {
  const rows = resultsData.map((row) => ({
    [t('full_name')]: row.user_name || '',
    [t('phone_number')]: row.phone || '',
    [`${t('pre_test')} Score`]: row.pre_score,
    [`${t('pre_test')} Max`]: row.pre_max,
    [`${t('pre_test')} %`]: row.pre_max > 0 ? Math.round((row.pre_score / row.pre_max) * 100) : 0,
    [`${t('post_test')} Score`]: row.post_score,
    [`${t('post_test')} Max`]: row.post_max,
    [`${t('post_test')} %`]: row.post_max > 0 ? Math.round((row.post_score / row.post_max) * 100) : 0,
    [`Improvement (${t('points')})`]: row.post_score - row.pre_score,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t('test'));
  XLSX.writeFile(wb, `test_results_${trainingTitle}_${Date.now()}.xlsx`);
};

/**
 * Export evaluation results to Excel
 */
export const exportEvaluations = (evalData, trainingTitle, t) => {
  const rows = evalData.map((row) => {
    const ratings = row.responses?.ratings || {};
    const open = row.responses?.open || {};
    
    return {
      [t('participant_code') || 'Participant Code']: row.user_id ? row.user_id.split('-')[0].toUpperCase() : '',
      [t('representation') || 'Representation']: row.users?.representation || '',
      [t('job_function') || 'Job Function']: row.users?.job_function || '',
      [t('eval_q1') || 'Q1']: ratings.q1 || '',
      [t('eval_q2') || 'Q2']: ratings.q2 || '',
      [t('eval_q3') || 'Q3']: ratings.q3 || '',
      [t('eval_q4') || 'Q4']: ratings.q4 || '',
      [t('eval_q5') || 'Q5']: ratings.q5 || '',
      [t('eval_q6') || 'Q6']: ratings.q6 || '',
      [t('eval_q7') || 'Q7']: ratings.q7 || '',
      [t('eval_q8') || 'Q8']: ratings.q8 || '',
      [t('eval_q9') || 'Q9']: ratings.q9 || '',
      [t('eval_q10') || 'Q10']: ratings.q10 || '',
      [t('eval_q11') || 'Q11']: ratings.q11 || '',
      [t('eval_q12') || 'Q12']: ratings.q12 || '',
      [t('eval_q13') || 'Q13']: ratings.q13 || '',
      [t('eval_q14') || 'Q14']: ratings.q14 || '',
      [`Average Rating`]: (
        [1,2,3,4,5,6,7,8,9,10,11,12,13,14].reduce((sum, i) => sum + (ratings[`q${i}`] || 0), 0) / 14
      ).toFixed(2),
      [t('eval_o1') || 'Open 1']: open.o1 || '',
      [t('eval_o2') || 'Open 2']: open.o2 || '',
      [t('eval_o3') || 'Open 3']: open.o3 || '',
      [t('eval_o4') || 'Open 4']: open.o4 || '',
      [t('date') || 'Date']: row.created_at ? format(new Date(row.created_at), 'yyyy-MM-dd') : '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, t('evaluation'));
  XLSX.writeFile(wb, `evaluations_${trainingTitle}_${Date.now()}.xlsx`);
};

/**
 * Export all data for a training in one workbook
 */
export const exportAll = (data, trainingTitle, t) => {
  const wb = XLSX.utils.book_new();

  if (data.attendance?.length) {
    const rows = data.attendance.map((row) => ({
      [t('first_name')]: row.users?.first_name || '',
      [t('father_name')]: row.users?.second_name || '',
      [t('grandfather_name')]: row.users?.third_name || '',
      [t('family_name')]: row.users?.fourth_name || '',
      [t('phone_number')]: row.users?.phone || '',
      [t('gender')]: row.users?.gender === 'Male' ? t('male') : (row.users?.gender === 'Female' ? t('female') : ''),
      [t('age')]: row.users?.age || '',
      [t('dob')]: row.users?.dob || '',
      [t('governorate')]: row.users?.governorate || '',
      [t('district')]: row.users?.district || '',
      [t('subdistrict')]: row.users?.subdistrict || '',
      [t('village_area')]: row.users?.village || '',
      [t('representation')]: row.users?.representation || '',
      [t('job_function')]: row.users?.job_function || '',
      [t('day')]: row.day_number,
      [t('date')]: row.date ? format(new Date(row.date), 'yyyy-MM-dd') : '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), t('attendance'));
  }

  if (data.testResults?.length) {
    const rows = data.testResults.map((row) => ({
      [t('full_name')]: row.user_name || '',
      [t('phone_number')]: row.phone || '',
      [`${t('pre_test')} Score`]: row.pre_score,
      [`${t('pre_test')} Max`]: row.pre_max,
      [`${t('post_test')} Score`]: row.post_score,
      [`${t('post_test')} Max`]: row.post_max,
      [`Improvement (${t('points')})`]: row.post_score - row.pre_score,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), t('test'));
  }

  if (data.evaluations?.length) {
    const rows = data.evaluations.map((row) => {
      const ratings = row.responses?.ratings || {};
      const open = row.responses?.open || {};
      
      return {
        [t('participant_code') || 'Participant Code']: row.user_id ? row.user_id.split('-')[0].toUpperCase() : '',
        [t('representation') || 'Representation']: row.users?.representation || '',
        [t('job_function') || 'Job Function']: row.users?.job_function || '',
        [t('eval_q1') || 'Q1']: ratings.q1 || '',
        [t('eval_q2') || 'Q2']: ratings.q2 || '',
        [t('eval_q3') || 'Q3']: ratings.q3 || '',
        [t('eval_q4') || 'Q4']: ratings.q4 || '',
        [t('eval_q5') || 'Q5']: ratings.q5 || '',
        [t('eval_q6') || 'Q6']: ratings.q6 || '',
        [t('eval_q7') || 'Q7']: ratings.q7 || '',
        [t('eval_q8') || 'Q8']: ratings.q8 || '',
        [t('eval_q9') || 'Q9']: ratings.q9 || '',
        [t('eval_q10') || 'Q10']: ratings.q10 || '',
        [t('eval_q11') || 'Q11']: ratings.q11 || '',
        [t('eval_q12') || 'Q12']: ratings.q12 || '',
        [t('eval_q13') || 'Q13']: ratings.q13 || '',
        [t('eval_q14') || 'Q14']: ratings.q14 || '',
        [t('eval_o1') || 'Open 1']: open.o1 || '',
        [t('eval_o2') || 'Open 2']: open.o2 || '',
        [t('eval_o3') || 'Open 3']: open.o3 || '',
        [t('eval_o4') || 'Open 4']: open.o4 || '',
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), t('evaluation'));
  }

  XLSX.writeFile(wb, `training_data_${trainingTitle}_${Date.now()}.xlsx`);
};
