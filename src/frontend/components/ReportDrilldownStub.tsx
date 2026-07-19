export function ReportDrilldownStub({ testId, title }: { testId: string; title: string }) {
  return <details data-testid={testId} aria-disabled="true" className="opacity-60"><summary className="cursor-not-allowed font-medium">{title}</summary><p className="mt-2 text-sm text-gray-500">Available after live calls (T2)</p></details>;
}
