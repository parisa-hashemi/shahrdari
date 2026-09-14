import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/feedback';

export default function NotFoundPage() {
  return (
    <EmptyState
      title="این صفحه وجود ندارد"
      description="نشانی واردشده در سامانه تعریف نشده است. ممکن است صفحه جابه‌جا شده یا دسترسی شما تغییر کرده باشد."
      action={
        <Link
          to="/dashboard"
          className="inline-flex h-9 items-center rounded-md bg-primary-600 px-4 text-sm text-white hover:bg-primary-700"
        >
          بازگشت به داشبورد
        </Link>
      }
    />
  );
}
