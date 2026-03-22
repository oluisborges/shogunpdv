export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-6xl font-bold text-gray-200">404</p>
        <h1 className="text-xl font-semibold text-gray-700 mt-4">
          Cardápio não encontrado
        </h1>
        <p className="text-gray-500 mt-2">
          Esta marmitaria não existe ou está inativa.
        </p>
      </div>
    </div>
  );
}
