import './styles.module.css';

export type EligibilityReceiptCardProps = {
  recommendation: 'likely' | 'unclear' | 'unlikely';
  explanation: string;
  receiptUrl: string;
  issuedAt: string;
  verifiedCredentialId?: string;
};

const recommendationLabels: Record<EligibilityReceiptCardProps['recommendation'], string> = {
  likely: 'Éligibilité probable',
  unclear: 'Examen humain requis',
  unlikely: 'Éligibilité peu probable',
};

export function EligibilityReceiptCard({
  explanation,
  issuedAt,
  receiptUrl,
  recommendation,
  verifiedCredentialId,
}: EligibilityReceiptCardProps) {
  return (
    <article className="insightsCard receiptCard" aria-labelledby="eligibility-receipt-title">
      <h2 id="eligibility-receipt-title">Reçu de pré-évaluation</h2>
      <p className="receiptRecommendation">{recommendationLabels[recommendation]}</p>
      <p>{explanation}</p>
      <dl className="receiptDetails">
        <div>
          <dt>Date d'émission</dt>
          <dd>
            <time dateTime={issuedAt}>{issuedAt}</time>
          </dd>
        </div>
        {verifiedCredentialId ? (
          <div>
            <dt>Identifiant Verified ID</dt>
            <dd>{verifiedCredentialId}</dd>
          </div>
        ) : null}
      </dl>
      <a className="receiptLink" href={receiptUrl}>
        Ouvrir le reçu Verified ID
      </a>
    </article>
  );
}
