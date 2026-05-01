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
  const rows = evalData.map((row) => ({
    [t('full_name')]: fullName(row.users),
    [t('phone_number')]: row.users?.phone || '',
    [t('representation')]: row.users?.representation || '',
    [t('job_function')]: row.users?.job_function || '',
    [t('content_quality')]: row.content_rating,
    [`${t('content_quality')} Comment`]: row.content_comment || '',
    [t('trainer_performance')]: row.trainer_rating,
    [`${t('trainer_performance')} Comment`]: row.trainer_comment || '',
    [t('logistics')]: row.logistics_rating,
    [`${t('logistics')} Comment`]: row.logistics_comment || '',
    [t('materials')]: row.materials_rating,
    [`${t('materials')} Comment`]: row.materials_comment || '',
    [t('overall_rating')]: row.overall_rating,
    [`${t('overall_rating')} Comment`]: row.overall_comment || '',
    [`Average Rating`]: (
      ((row.content_rating || 0) + (row.trainer_rating || 0) +
       (row.logistics_rating || 0) + (row.materials_rating || 0) +
       (row.overall_rating || 0)) / 5
    ).toFixed(2),
    [t('additional_comments')]: row.comments || '',
    [t('date')]: row.created_at ? format(new Date(row.created_at), 'yyyy-MM-dd') : '',
  }));

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
    const rows = data.evaluations.map((row) => ({
      [t('full_name')]: fullName(row.users),
      [t('representation')]: row.users?.representation || '',
      [t('job_function')]: row.users?.job_function || '',
      [t('content_quality')]: row.content_rating,
      [`${t('content_quality')} Comment`]: row.content_comment || '',
      [t('trainer_performance')]: row.trainer_rating,
      [`${t('trainer_performance')} Comment`]: row.trainer_comment || '',
      [t('logistics')]: row.logistics_rating,
      [`${t('logistics')} Comment`]: row.logistics_comment || '',
      [t('materials')]: row.materials_rating,
      [`${t('materials')} Comment`]: row.materials_comment || '',
      [t('overall_rating')]: row.overall_rating,
      [`${t('overall_rating')} Comment`]: row.overall_comment || '',
      [t('additional_comments')]: row.comments || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), t('evaluation'));
  }

  XLSX.writeFile(wb, `training_data_${trainingTitle}_${Date.now()}.xlsx`);
};
