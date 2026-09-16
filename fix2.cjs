
const fs = require('fs');
let code = fs.readFileSync('src/components/VisualAgencyHub.tsx', 'utf-8');

const search = \                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-HUB TAB 2: SQUAD CAPACITY & HEATMAP */}\;

const replace = \                  </div>
                )}
              </div>
            )}
            </div>
          </div>
          )}

          {/* SUB-HUB TAB 2: SQUAD CAPACITY & HEATMAP */}\;

code = code.replace(search, replace);
fs.writeFileSync('src/components/VisualAgencyHub.tsx', code);
console.log('Fixed structure at end of projects tab');

