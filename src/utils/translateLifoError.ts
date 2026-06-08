/**
 * ترجمة أخطاء الاتحاد لرسائل واضحة ومفهومة للمستخدم باللغة العربية
 */
export const translateLifoError = (msg: string): string => {
  if (!msg) return 'حدث خطأ غير معروف أثناء الاتصال بالاتحاد';
  
  const lower = msg.toLowerCase();
  
  if (
    lower.includes('no cards in your inventory') || 
    (lower.includes('no cards') && lower.includes('inventory')) ||
    (lower.includes('completed') && lower.includes('cards'))
  ) {
    return 'لا توجد بطاقات برتقالية (نشطة) مخصصة لمكتبك في مخزن الاتحاد حالياً. يرجى تزويد المكتب بالبطاقات أولاً.';
  }
  
  if (
    lower.includes('not enough cards') || 
    lower.includes('not enough') || 
    lower.includes('cards not found in company inventory')
  ) {
    return 'لا توجد بطاقات كافية في مخزون الشركة الرئيسي للتوزيع حالياً.';
  }
  
  if (
    lower.includes('incorrect') && 
    (lower.includes('email') || lower.includes('password') || lower.includes('username') || lower.includes('credential') || lower.includes('please check'))
  ) {
    return 'بيانات الاعتماد الخاصة بالاتحاد غير صحيحة. يرجى التحقق من اسم المستخدم وكلمة المرور.';
  }
  
  if (
    lower.includes('authentication failed') || 
    lower.includes('user not found') || 
    lower.includes('not active') ||
    lower.includes('invalid credentials')
  ) {
    return 'فشل تسجيل الدخول إلى الاتحاد. يرجى التحقق من صلاحيات حسابك.';
  }
  
  if (
    lower.includes('incomplete') || 
    lower.includes('required') || 
    lower.includes('missing') ||
    lower.includes('validation')
  ) {
    return 'البيانات المرسلة للاتحاد غير مكتملة أو تحتوي على قيم غير صالحة.';
  }
  
  if (
    lower.includes('privilege') || 
    lower.includes('permission') || 
    lower.includes('authorized') ||
    lower.includes('unauthorized')
  ) {
    return 'حسابك لا يمتلك الصلاحيات الكافية لإتمام هذه العملية على نظام الاتحاد.';
  }
  
  if (
    lower.includes('does not exist') || 
    lower.includes('doesn\'t exist') ||
    lower.includes('not exist')
  ) {
    return 'المستند أو الرقم المطلوب غير موجود في نظام الاتحاد.';
  }
  
  if (lower.includes('office not found')) {
    return 'لم يتم العثور على المكتب المحدد في نظام الاتحاد.';
  }
  
  if (lower.includes('already used') || lower.includes('already exist')) {
    return 'هذه البطاقة مستخدمة بالفعل أو موجودة مسبقاً في النظام.';
  }
  
  if (lower.includes('card number is required')) {
    return 'رقم البطاقة مطلوب لإتمام هذه العملية.';
  }
  
  if (lower.includes('the office already has cards')) {
    return 'المكتب يحتوي بالفعل على بطاقات، لا يمكن إتمام العملية.';
  }
  
  if (lower.includes('invalid card status')) {
    return 'حالة البطاقة غير صالحة لإتمام هذه العملية.';
  }
  
  if (lower.includes('office_id') || lower.includes('offices_id')) {
    return 'رقم تعريف المكتب غير صحيح أو غير متوفر.';
  }
  
  if (lower.includes('numerofcard') || lower.includes('numberofcard')) {
    return 'يرجى إدخال عدد بطاقات صحيح وصالح للتوزيع.';
  }
  
  if (lower.includes('timeout') || lower.includes('abort') || lower.includes('timed out')) {
    return 'انتهت مهلة الاتصال بالاتحاد. يرجى المحاولة مرة أخرى لاحقاً.';
  }
  
  if (lower.includes('404') || lower.includes('not found')) {
    return 'الرابط المطلوب غير متوفر على خادم الاتحاد (خطأ 404).';
  }

  // If there's a specific message from Laravel/Union or if it is already in Arabic, keep it as is
  return msg;
};
