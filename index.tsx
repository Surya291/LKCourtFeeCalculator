/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {useState, Fragment} from 'react';
import ReactDOM from 'react-dom/client';

const SECTIONS_DATA = {
    '21': {
        caseType: 'Money recovery, damages, arrears.',
        formulaDescription: 'Fee is calculated on the amount claimed.',
        inputs: [{ name: 'amountClaimed', label: 'Amount Claimed' }],
        calculate: (inputs) => parseFloat(inputs.amountClaimed || 0),
    },
    '22': {
        caseType: 'Maintenance / annuity.',
        formulaDescription: "For maintenance = 1 year's amount.\nFor increase/reduction = difference for 1 year.\nFor annuities = 5 × annual amount (or actual value if for less than 5 years).",
        inputs: [
            { name: 'maintenanceAmount', label: 'Monthly Maintenance or Difference' },
            { name: 'annuityAmount', label: 'Annual Annuity Amount' },
            { name: 'annuityYears', label: 'Annuity Years (if less than 5)' },
        ],
        calculate: (inputs) => {
            if (inputs.maintenanceAmount) return parseFloat(inputs.maintenanceAmount) * 12;
            if (inputs.annuityAmount) {
                const years = parseFloat(inputs.annuityYears) < 5 ? parseFloat(inputs.annuityYears) : 5;
                return parseFloat(inputs.annuityAmount) * years;
            }
            return 0;
        },
    },
    '23': {
        caseType: 'Movable property.',
        formulaDescription: 'Fee is based on:\n- Market value.\n- Plaintiff’s valuation if no market value.\n- Debt amount for pledged goods.\n- 1/8 of secured property value for title documents.',
        inputs: [
            { name: 'marketValue', label: 'Market Value' },
            { name: 'plaintiffValuation', label: "Plaintiff's Valuation" },
            { name: 'debtAmount', label: 'Debt Amount for Pledged Goods' },
            { name: 'securedProperty', label: 'Value of Secured Property' },
        ],
        calculate: (inputs) => {
            if (inputs.securedProperty) return parseFloat(inputs.securedProperty) / 8;
            return parseFloat(inputs.marketValue || inputs.plaintiffValuation || inputs.debtAmount || 0);
        }
    },
    '24': {
        caseType: 'Declaration suits.',
        formulaDescription: 'Fee is the higher of a calculated value or ₹1000.\n- Declaration + possession: Market value.\n- Declaration + injunction: Half of market value.\n- Other declarations: Plaintiff\'s valuation.',
        inputs: [
            { name: 'marketValue', label: 'Market Value' },
            { name: 'plaintiffValuation', label: "Plaintiff's Valuation" }
        ],
        calculate: (inputs) => Math.max(parseFloat(inputs.marketValue || inputs.plaintiffValuation) || 0, 1000)
    },
    '25': {
        caseType: 'Adoption disputes.',
        formulaDescription: 'Fixed fee based on property value:\n- ≤ ₹5,000 → ₹25\n- ₹5,000–₹15,000 → ₹100\n- > ₹15,000 → ₹250',
        inputs: [{ name: 'propertyValue', label: 'Property Value' }],
        calculate: (inputs) => {
            const value = parseFloat(inputs.propertyValue || 0);
            if (value <= 5000) return 25;
            if (value <= 15000) return 100;
            return 250;
        }
    },
    '26': {
        caseType: 'Injunction suits.',
        formulaDescription: '- If property title is denied: Higher of (½ market value, ₹1000).\n- For other injunctions: Higher of (plaintiff’s valuation, ₹1000).',
        inputs: [
            { name: 'marketValue', label: 'Market Value (if title denied)' },
            { name: 'plaintiffValuation', label: "Plaintiff's Valuation (for other injunctions)" }
        ],
        calculate: (inputs) => {
             const val = inputs.marketValue ? parseFloat(inputs.marketValue)/2 : parseFloat(inputs.plaintiffValuation || 0);
             return Math.max(val, 1000);
        }
    },
    '27': {
        caseType: 'Trust property disputes.',
        formulaDescription: 'Fee is ⅕ of market value (max ₹200) OR ₹1000 if no market value exists.',
        inputs: [{ name: 'marketValue', label: 'Market Value' }],
        calculate: (inputs) => inputs.marketValue ? Math.min(parseFloat(inputs.marketValue) / 5, 200) : 1000
    },
    '28': {
        caseType: 'Possession under Specific Relief Act.',
        formulaDescription: 'Fee is the higher of (½ market value, ₹1000).',
        inputs: [{ name: 'marketValue', label: 'Market Value' }],
        calculate: (inputs) => Math.max(parseFloat(inputs.marketValue || 0) / 2, 1000)
    },
    '29': {
        caseType: 'Possession suits (general).',
        formulaDescription: 'Fee is the higher of (market value, ₹1000).',
        inputs: [{ name: 'marketValue', label: 'Market Value' }],
        calculate: (inputs) => Math.max(parseFloat(inputs.marketValue || 0), 1000)
    },
    '30': {
        caseType: 'Easement rights (right of way, water, light etc.).',
        formulaDescription: 'Fee is the higher of (plaintiff’s valuation, ₹1000), plus any additional compensation claimed.',
        inputs: [
            { name: 'plaintiffValuation', label: "Plaintiff's Valuation" },
            { name: 'compensationClaimed', label: 'Compensation Claimed' }
        ],
        calculate: (inputs) => Math.max(parseFloat(inputs.plaintiffValuation || 0), 1000) + parseFloat(inputs.compensationClaimed || 0)
    },
    '31': {
        caseType: 'Pre-emption suits (right to buy before others).',
        formulaDescription: 'Fee is based on the lower of the sale consideration and the market value.',
        inputs: [
            { name: 'saleConsideration', label: 'Sale Consideration' },
            { name: 'marketValue', label: 'Market Value' }
        ],
        calculate: (inputs) => Math.min(parseFloat(inputs.saleConsideration || 0), parseFloat(inputs.marketValue || 0)) || 0
    },
    '32': {
        caseType: 'Mortgage cases.',
        formulaDescription: '- Recovery: Fee on amount claimed.\n- Redemption: Higher of (amount due, ¼ principal).\n- Foreclosure/Sale: Fee on principal + interest.',
        inputs: [
            { name: 'amountClaimed', label: 'Amount Claimed (for recovery)' },
            { name: 'amountDue', label: 'Amount Due (for redemption)' },
            { name: 'principal', label: 'Principal Amount' },
            { name: 'interest', label: 'Interest (for foreclosure/sale)' },
        ],
        calculate: (inputs) => {
            if (inputs.amountClaimed) return parseFloat(inputs.amountClaimed);
            if (inputs.principal && inputs.interest) return parseFloat(inputs.principal) + parseFloat(inputs.interest);
            if (inputs.amountDue && inputs.principal) return Math.max(parseFloat(inputs.amountDue), parseFloat(inputs.principal) / 4);
            return 0;
        }
    },
    '33': {
        caseType: 'Accounts suits (business, partnerships, etc.).',
        formulaDescription: 'Fee is based on plaintiff’s estimated due amount (will be adjusted later if a higher amount is decreed).',
        inputs: [{ name: 'estimatedDue', label: 'Estimated Amount Due' }],
        calculate: (inputs) => parseFloat(inputs.estimatedDue || 0)
    },
    '34': {
        caseType: 'Partnership dissolution.',
        formulaDescription: 'Fee is based on plaintiff’s estimated share value (will be adjusted later if a higher amount is decreed).',
        inputs: [{ name: 'estimatedShare', label: 'Estimated Share Value' }],
        calculate: (inputs) => parseFloat(inputs.estimatedShare || 0)
    },
    '35': {
        caseType: 'Partition of joint family property.',
        formulaDescription: '- If excluded from possession: Fee on market value of share.\n- If in joint possession: Fixed fee based on property value slab.',
        inputs: [
            { name: 'shareMarketValue', label: 'Market Value of Share (if excluded)' },
            { name: 'totalValue', label: 'Total Property Value (if in joint possession)' }
        ],
        calculate: (inputs) => {
            if (inputs.shareMarketValue) return parseFloat(inputs.shareMarketValue);
            if (inputs.totalValue) {
                const value = parseFloat(inputs.totalValue);
                if (value <= 3000) return 15;
                if (value <= 5000) return 30;
                if (value <= 10000) return 100;
                return 200;
            }
            return 0;
        }
    },
    '36': {
        caseType: 'Joint possession claim (where excluded).',
        formulaDescription: 'Fee is calculated on the market value of the plaintiff’s share.',
        inputs: [{ name: 'shareMarketValue', label: "Plaintiff's Share Market Value" }],
        calculate: (inputs) => parseFloat(inputs.shareMarketValue || 0)
    },
    '37': {
        caseType: 'Administration suits (estate distribution).',
        formulaDescription: 'Fee is as per Section 47 slab, adjusted later based on actual share value.',
        inputs: [{ name: 'estimatedValue', label: 'Estimated Value of Estate' }],
        calculate: (inputs) => { // Same as Sec 47
            const value = parseFloat(inputs.estimatedValue || 0);
            if (value <= 5000) return 20;
            if (value <= 10000) return 100;
            return 200;
        }
    },
    '38': {
        caseType: 'Cancel decrees / documents.',
        formulaDescription: 'Fee is based on the value of the decree/property for whole cancellation, or the value of the part affected for partial cancellation.',
        inputs: [{ name: 'value', label: 'Value of Decree / Property / Part Affected' }],
        calculate: (inputs) => parseFloat(inputs.value || 0)
    },
    '39': {
        caseType: 'Set aside attachment orders.',
        formulaDescription: 'Fee is the lower of (¼ market value of property, attachment amount).',
        inputs: [
            { name: 'marketValue', label: 'Market Value of Property' },
            { name: 'attachmentAmount', label: 'Attachment Amount' }
        ],
        calculate: (inputs) => Math.min(parseFloat(inputs.marketValue || 0) / 4, parseFloat(inputs.attachmentAmount || Infinity)) || 0
    },
    '40': {
        caseType: 'Specific performance (contracts).',
        formulaDescription: '- Sale: Sale consideration.\n- Mortgage: Amount secured.\n- Lease: Fine/premium + avg annual rent.\n- Exchange: Higher of (consideration, market value).',
        inputs: [
            { name: 'saleConsideration', label: 'Sale Consideration / Amount Secured' },
            { name: 'finePremium', label: 'Fine / Premium (for lease)' },
            { name: 'avgAnnualRent', label: 'Average Annual Rent (for lease)' },
            { name: 'exchangeMarketValue', label: 'Property Market Value (for exchange)' },
        ],
        calculate: (inputs) => {
            if (inputs.saleConsideration) return parseFloat(inputs.saleConsideration);
            if (inputs.finePremium || inputs.avgAnnualRent) return parseFloat(inputs.finePremium || 0) + parseFloat(inputs.avgAnnualRent || 0);
            if (inputs.exchangeMarketValue) return Math.max(parseFloat(inputs.saleConsideration || 0), parseFloat(inputs.exchangeMarketValue));
            return 0;
        }
    },
    '41': {
        caseType: 'Landlord–tenant disputes.',
        formulaDescription: "Fee is calculated on one year's rent (or rent + premium for possession recovery).",
        inputs: [
            { name: 'annualRent', label: 'Annual Rent' },
            { name: 'premium', label: 'Premium paid (for possession recovery)' },
        ],
        calculate: (inputs) => parseFloat(inputs.annualRent || 0) + parseFloat(inputs.premium || 0)
    },
    '42': {
        caseType: 'Mesne profits (illegal occupation income).',
        formulaDescription: 'Fee is based on the amount estimated; will be adjusted later if a higher amount is found.',
        inputs: [{ name: 'estimatedAmount', label: 'Estimated Amount' }],
        calculate: (inputs) => parseFloat(inputs.estimatedAmount || 0)
    },
    '43': {
        caseType: 'Revenue entry suits.',
        formulaDescription: 'A fixed fee of ₹50 is applicable.',
        inputs: [],
        calculate: () => 50
    },
    '44': {
        caseType: 'Public interest suits (Religious Endowments Act, CPC Sec. 91/92, etc.).',
        formulaDescription: 'A fixed fee of ₹50 is applicable.',
        inputs: [],
        calculate: () => 50
    },
    '45': {
        caseType: 'Interpleader (2+ parties claim same money/property).',
        formulaDescription: 'Fee is as per Section 47 slab, with the balance shared by claimants.',
        inputs: [{ name: 'propertyValue', label: 'Value of Money/Property in Dispute' }],
        calculate: (inputs) => { // Same as Sec 47
            const value = parseFloat(inputs.propertyValue || 0);
            if (value <= 5000) return 20;
            if (value <= 10000) return 100;
            return 200;
        }
    },
    '46': {
        caseType: 'Third party proceedings (indemnity claims).',
        formulaDescription: 'Fee is calculated as ½ of the indemnity/contribution claimed.',
        inputs: [{ name: 'indemnityClaimed', label: 'Indemnity/Contribution Claimed' }],
        calculate: (inputs) => parseFloat(inputs.indemnityClaimed || 0) / 2
    },
    '47': {
        caseType: 'Miscellaneous suits (not covered elsewhere).',
        formulaDescription: 'Revenue court: ₹50.\nCivil court slab:\n- ≤ ₹5,000 → ₹20\n- ₹5,000–₹10,000 → ₹100\n- > ₹10,000 → ₹200',
        inputs: [{ name: 'claimValue', label: 'Claim or Property Value' }],
        calculate: (inputs) => {
            const value = parseFloat(inputs.claimValue || 0);
            if (value <= 5000) return 20;
            if (value <= 10000) return 100;
            return 200;
        }
    },
    '48': {
        caseType: 'Appeals in land acquisition compensation.',
        formulaDescription: 'Fee is the difference between the award amount and the amount claimed.',
        inputs: [
            { name: 'awardAmount', label: 'Award Amount' },
            { name: 'amountClaimed', label: 'Amount Claimed' }
        ],
        calculate: (inputs) => Math.abs(parseFloat(inputs.awardAmount || 0) - parseFloat(inputs.amountClaimed || 0)),
    },
    '49': {
        caseType: 'General appeals.',
        formulaDescription: 'The court fee is the same as the fee paid for the original suit.',
        inputs: [],
        isDisplayOnly: true,
        displayMessage: 'The fee is the same as for the original suit. This value must be determined from the original filing.'
    },
    '52-54': {
        caseType: 'Probate / Letters of administration.',
        formulaDescription: 'Fee is calculated as:\n- 3% of value if value is ≤ ₹3,00,000.\n- Plus 5% on the amount exceeding ₹3,00,000.\n- The maximum fee is capped at ₹30,000.',
        inputs: [{ name: 'propertyValue', label: 'Value of Property / Estate' }],
        calculate: (inputs) => {
            const value = parseFloat(inputs.propertyValue || 0);
            let fee = 0;
            if (value <= 300000) {
                fee = value * 0.03;
            } else {
                fee = (300000 * 0.03) + ((value - 300000) * 0.05);
            }
            return Math.min(fee, 30000);
        },
    },
    '55-61': {
        caseType: 'Miscellaneous grants, underpayment, overpayment, etc.',
        formulaDescription: 'These are procedural matters and do not have a direct fee calculation formula.',
        inputs: [],
        isDisplayOnly: true,
        displayMessage: 'This section covers procedural matters without a standard calculation formula.'
    },
    'Schedule I': {
        caseType: 'Applications, writ petitions, caveats.',
        formulaDescription: 'Fixed amounts apply.\nFor example: ₹50 for a writ under Art. 226/227, or ₹20 for simple applications.',
        inputs: [],
        isDisplayOnly: true,
        displayMessage: 'Fixed fees apply depending on the specific application (e.g., ₹50 for writ petitions, ₹20 for simple applications).'
    },
    'Schedule II': {
        caseType: 'Copies, certificates, etc.',
        formulaDescription: 'Fixed nominal fees apply (typically a few rupees).',
        inputs: [],
        isDisplayOnly: true,
        displayMessage: 'Fixed nominal fees apply for services like obtaining copies or certificates.'
    }
};

const SECTION_ORDER = [
    '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32',
    '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44',
    '45', '46', '47', '48', '49', '52-54', '55-61', 'Schedule I', 'Schedule II'
];

function App() {
  const [selectedSection, setSelectedSection] = useState('');
  const [inputValues, setInputValues] = useState({});
  const [result, setResult] = useState(null);

  const handleSectionChange = (e) => {
    const sectionKey = e.target.value;
    setSelectedSection(sectionKey);
    setInputValues({});

    const sectionData = SECTIONS_DATA[sectionKey];
    if (sectionData && sectionData.isDisplayOnly) {
        setResult({
            fee: null,
            formula: sectionData.formulaDescription,
            message: sectionData.displayMessage,
        });
    } else {
        setResult(null);
    }
  };

  const formatIndianNumber = (numStr) => {
    if (!numStr || typeof numStr !== 'string') return '';
    const [integerPart, decimalPart] = numStr.split('.');
    
    if (integerPart === undefined) return '';

    const lastThree = integerPart.slice(-3);
    const otherNumbers = integerPart.slice(0, -3);
    const formattedOtherNumbers = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    
    let formattedInteger = otherNumbers ? `${formattedOtherNumbers},${lastThree}` : lastThree;

    if (decimalPart !== undefined) {
        return `${formattedInteger}.${decimalPart}`;
    }
    return formattedInteger;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    // Remove all non-digit characters except for the decimal point
    const sanitizedValue = value.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    if ((sanitizedValue.match(/\./g) || []).length > 1) {
      return;
    }
    
    setInputValues(prev => ({ ...prev, [name]: sanitizedValue }));
  };

  const handleCalculate = (e) => {
    e.preventDefault();
    if (!selectedSection) return;

    const sectionData = SECTIONS_DATA[selectedSection];
    const fee = sectionData.calculate(inputValues);

    setResult({
      fee: fee,
      formula: sectionData.formulaDescription
    });
  };

  const currentSection = SECTIONS_DATA[selectedSection];
  const currencyFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });

  return (
    <div className="calculator-container">
      <h1 className="main-title">
        <span role="img" aria-label="Balance Scale">⚖️</span>
        Karnataka Court Fee Calculator
      </h1>
      <p className="subtitle">Estimate court fees based on the Karnataka Court-Fee and Suits Valuation Act, 1958.</p>

      <form onSubmit={handleCalculate}>
        <div className="form-group">
          <label htmlFor="section-select">Select Section No. / Schedule:</label>
          <select id="section-select" value={selectedSection} onChange={handleSectionChange}>
            <option value="" disabled>-- Choose an option --</option>
            {SECTION_ORDER.map(section => (
               <option key={section} value={section}>
                 {section.includes('Schedule') ? section : `Section ${section}`}
               </option>
            ))}
          </select>
        </div>

        {currentSection && (
          <Fragment>
            <div className="description">
              <p><strong>Type of Case:</strong> {currentSection.caseType}</p>
            </div>
             {!currentSection.isDisplayOnly && currentSection.inputs.map(input => (
              <div className="form-group has-prefix" key={input.name}>
                <input
                  type="text"
                  inputMode="decimal"
                  id={input.name}
                  name={input.name}
                  value={formatIndianNumber(inputValues[input.name] || '')}
                  onChange={handleInputChange}
                  placeholder=" "
                  required={currentSection.inputs.length === 1}
                />
                <label htmlFor={input.name}>{input.label}</label>
              </div>
            ))}
            {!currentSection.isDisplayOnly && <button type="submit" className="calculate-btn">Calculate Court Fee</button>}
          </Fragment>
        )}
      </form>

      {result !== null && (
        <div className="result-container">
          <h2>Calculation Details</h2>
          <p className="result-formula"><strong>Formula / Rule:</strong> {result.formula}</p>
          {result.fee !== null ? (
            <div className="result-fee">
              Estimated Court Fee: {currencyFormatter.format(result.fee)}
            </div>
           ) : (
             <div className="result-message">{result.message}</div>
           )}
        </div>
      )}

      <p className="built-by-link">
        Built by <a href="https://lendingkatalyst.com/" target="_blank" rel="noopener noreferrer">Lending Katalyst</a>
      </p>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);