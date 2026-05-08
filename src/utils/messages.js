/**
 * ترجمة رسائل الباك إند من الإنجليزية إلى العربية
 */
const translations = {
  // Product
  'Product already exist': 'المنتج موجود بالفعل',
  'Product not found': 'المنتج غير موجود',
  'Product created successfully': 'تم إنشاء المنتج بنجاح',
  'Failed to create Product': 'فشل في إنشاء المنتج',
  'Product updated successfully': 'تم تحديث المنتج بنجاح',
  'Failed to update Product': 'فشل في تحديث المنتج',
  'Product deleted successfully': 'تم حذف المنتج بنجاح',
  'Failed to delete Product': 'فشل في حذف المنتج',
  'Product fetched successfully': 'تم جلب المنتج بنجاح',
  'Product failed to fetch': 'فشل في جلب المنتجات',
  'Product name is already taken': 'اسم المنتج مستخدم بالفعل',
  'No products found in this price range': 'لا توجد منتجات في هذا النطاق السعري',
  'One or more products are out of stock': 'منتج واحد أو أكثر غير متوفر في المخزون',
  'Stock updated successfully': 'تم تحديث المخزون بنجاح',

  // Customer
  'Customer already exist': 'العميل موجود بالفعل',
  'Customer not found': 'العميل غير موجود',
  'Customer created successfully': 'تم إنشاء العميل بنجاح',
  'Failed to create Customer': 'فشل في إنشاء العميل',
  'Customer updated successfully': 'تم تحديث العميل بنجاح',
  'Failed to update Customer': 'فشل في تحديث العميل',
  'Customer deleted successfully': 'تم حذف العميل بنجاح',
  'Failed to delete Customer': 'فشل في حذف العميل',
  'Customer fetched successfully': 'تم جلب العميل بنجاح',
  'Customer failed to fetch': 'فشل في جلب العملاء',
  'Phone already in use': 'رقم الهاتف مستخدم بالفعل',
  'Email already in use': 'البريد الإلكتروني مستخدم بالفعل',

  // Invoice
  'Invoice already exist': 'الفاتورة موجودة بالفعل',
  'Invoice not found': 'الفاتورة غير موجودة',
  'Invoice created successfully': 'تم إنشاء الفاتورة بنجاح',
  'Failed to create Invoice': 'فشل في إنشاء الفاتورة',
  'Invoice updated successfully': 'تم تحديث الفاتورة بنجاح',
  'Failed to update Invoice': 'فشل في تحديث الفاتورة',
  'Invoice deleted successfully': 'تم حذف الفاتورة بنجاح',
  'Failed to delete Invoice': 'فشل في حذف الفاتورة',
  'Invoice fetched successfully': 'تم جلب الفاتورة بنجاح',
  'Invoice failed to fetch': 'فشل في جلب الفواتير',
  'Item not found in invoice': 'العنصر غير موجود في الفاتورة',
  'Invalid return quantity': 'كمية الإرجاع غير صحيحة',
  'Invoice refunded successfully': 'تم إرجاع الفاتورة بنجاح',
  'Failed to fetch invoices': 'فشل في جلب الفواتير',
  'No invoices found for this customer': 'لا توجد فواتير لهذا العميل',
  'No invoices found for this payment method': 'لا توجد فواتير لطريقة الدفع هذه',
  'No invoices found with this status': 'لا توجد فواتير بهذه الحالة',

  // User / Auth
  'User already exist': 'المستخدم موجود بالفعل',
  'User not found': 'المستخدم غير موجود',
  'Invalid code or password': 'الكود أو كلمة المرور غير صحيحة',
  'Login successful': 'تم تسجيل الدخول بنجاح',
  'token not provided': 'يجب تسجيل الدخول أولاً',
  'invalid token': 'جلسة منتهية — يرجى تسجيل الدخول مرة أخرى',

  // Validation
  'is not allowed': 'غير مسموح',
  'is required': 'مطلوب',
};

/**
 * ترجمة رسالة من الإنجليزية إلى العربية
 * يبحث عن تطابق كامل أولاً، ثم تطابق جزئي
 */
export function translateMessage(msg) {
  if (!msg || typeof msg !== 'string') return msg;

  // تطابق كامل
  if (translations[msg]) return translations[msg];

  // تطابق جزئي (مثل "No products found with name: X")
  for (const [en, ar] of Object.entries(translations)) {
    if (msg.includes(en)) {
      return msg.replace(en, ar);
    }
  }

  // رسائل Joi validation بالإنجليزية
  if (msg.startsWith('"') && msg.includes('" is')) {
    return 'خطأ في البيانات المدخلة: ' + msg;
  }

  return msg;
}
