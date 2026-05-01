import * as XLSX from 'xlsx';
import { format } from 'date-fns';

/**
 * Export attendance data to Excel
 */
export const exportAttendance = (attendanceData, trainingTitle) => {
  const rows = attendanceData.map((row) => ({
    'الاسم': row.users?.name || '',
    'رقم الهاتف': row.users?.phone || '',
    'الجنس': row.users?.gender === 'male' ? 'ذكر' : 'أنثى',
    'العمر': row.users?.age || '',
    'المحافظة': row.users?.governorate || '',
    'القضاء': row.users?.district || '',
    'الناحية': row.users?.subdistrict || '',
    'اليوم': row.day_number,
    'التاريخ': row.date ? format(new Date(row.date), 'yyyy-MM-dd') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
  XLSX.writeFile(wb, `attendance_${trainingTitle}_${Date.now()}.xlsx`);
};

/**
 * Export test results to Excel
 */
export const exportTestResults = (resultsData, trainingTitle) => {
  const rows = resultsData.map((row) => ({
    'الاسم': row.user_name || '',
    'رقم الهاتف': row.phone || '',
    'درجة الاختبار القبلي': row.pre_score,
    'المجموع القبلي': row.pre_max,
    'نسبة القبلي %': row.pre_max > 0 ? Math.round((row.pre_score / row.pre_max) * 100) : 0,
    'درجة الاختبار البعدي': row.post_score,
    'المجموع البعدي': row.post_max,
    'نسبة البعدي %': row.post_max > 0 ? Math.round((row.post_score / row.post_max) * 100) : 0,
    'التحسن': row.post_score - row.pre_score,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Test Results');
  XLSX.writeFile(wb, `test_results_${trainingTitle}_${Date.now()}.xlsx`);
};

/**
 * Export evaluation results to Excel
 */
export const exportEvaluations = (evalData, trainingTitle) => {
  const rows = evalData.map((row) => ({
    'الاسم': row.users?.name || '',
    'رقم الهاتف': row.users?.phone || '',
    'جودة المحتوى': row.content_rating,
    'أداء المدرب': row.trainer_rating,
    'اللوجستيات': row.logistics_rating,
    'المواد': row.materials_rating,
    'التقييم العام': row.overall_rating,
    'متوسط التقييم': (
      ((row.content_rating || 0) +
        (row.trainer_rating || 0) +
        (row.logistics_rating || 0) +
        (row.materials_rating || 0) +
        (row.overall_rating || 0)) / 5
    ).toFixed(2),
    'التعليقات': row.comments || '',
    'التاريخ': row.created_at ? format(new Date(row.created_at), 'yyyy-MM-dd') : '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Evaluations');
  XLSX.writeFile(wb, `evaluations_${trainingTitle}_${Date.now()}.xlsx`);
};

/**
 * Export all data for a training in one workbook
 */
export const exportAll = (data, trainingTitle) => {
  const wb = XLSX.utils.book_new();

  // Attendance sheet
  if (data.attendance?.length) {
    const attRows = data.attendance.map((row) => ({
      'الاسم': row.users?.name || '',
      'رقم الهاتف': row.users?.phone || '',
      'الجنس': row.users?.gender === 'male' ? 'ذكر' : 'أنثى',
      'العمر': row.users?.age || '',
      'المحافظة': row.users?.governorate || '',
      'القضاء': row.users?.district || '',
      'اليوم': row.day_number,
      'التاريخ': row.date ? format(new Date(row.date), 'yyyy-MM-dd') : '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attRows), 'Attendance');
  }

  // Test Results sheet
  if (data.testResults?.length) {
    const testRows = data.testResults.map((row) => ({
      'الاسم': row.user_name || '',
      'رقم الهاتف': row.phone || '',
      'درجة القبلي': row.pre_score,
      'مجموع القبلي': row.pre_max,
      'درجة البعدي': row.post_score,
      'مجموع البعدي': row.post_max,
      'التحسن': row.post_score - row.pre_score,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(testRows), 'Test Results');
  }

  // Evaluations sheet
  if (data.evaluations?.length) {
    const evalRows = data.evaluations.map((row) => ({
      'الاسم': row.users?.name || '',
      'جودة المحتوى': row.content_rating,
      'أداء المدرب': row.trainer_rating,
      'اللوجستيات': row.logistics_rating,
      'المواد': row.materials_rating,
      'التقييم العام': row.overall_rating,
      'التعليقات': row.comments || '',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(evalRows), 'Evaluations');
  }

  XLSX.writeFile(wb, `training_data_${trainingTitle}_${Date.now()}.xlsx`);
};
