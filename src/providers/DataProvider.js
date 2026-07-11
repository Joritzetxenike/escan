import { DataSource } from './DataSource';

import * as CsvProvider from './csv/csvProvider';
import * as ApiProvider from './api/apiProvider';

const provider =
  DataSource === 'csv'
    ? CsvProvider
    : ApiProvider;

export default provider;

